import { describe, it, expect } from 'vitest';
import { buildPowerSchoolSheet, categoryColumns, joinComments, latestLevel } from './powerschool';
import { buildFullLogSheet } from './fullLog';
import { toCsv, exportFilename, BOM } from './csv';
import type { ExportBundle, ClassExport } from './types';
import type { Assessment, Attendance, ClassGroup, Rubric, Session, Student } from '../../db/types';

/* Builders keep the fixtures readable; only the fields under test vary. */

let seq = 0;
const id = (p: string) => `${p}-${++seq}`;

function student(firstName: string, lastName: string, studentNumber?: string): Student {
  return {
    id: id('s'),
    classId: 'c1',
    firstName,
    lastName,
    ...(studentNumber ? { studentNumber } : {}),
    active: true,
    createdAt: 0,
  };
}

function rubric(categories: string[]): Rubric {
  return {
    id: id('r'),
    name: 'PE Rubric',
    categories: categories.map((name, i) => ({ id: id('cat'), name, order: i })),
    levels: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function assessment(
  studentId: string,
  categoryName: string,
  levelCode: string,
  createdAt: number,
  comment = '',
  sessionId = 'sess1',
): Assessment {
  return {
    id: id('a'),
    sessionId,
    classId: 'c1',
    studentId,
    categoryId: id('cid'),
    categoryName,
    levelId: id('lid'),
    levelCode,
    comment,
    createdAt,
    updatedAt: createdAt,
  };
}

function session(date: string, sid = 'sess1'): Session {
  return { id: sid, classId: 'c1', date, startedAt: 0 };
}

function attendance(studentId: string, status: Attendance['status'], sessionId = 'sess1'): Attendance {
  return { id: id('att'), sessionId, studentId, status, updatedAt: 1000 };
}

function cls(name: string): ClassGroup {
  return {
    id: 'c1',
    name,
    rubricId: 'r1',
    gridOrder: 'first',
    customOrder: [],
    archived: false,
    createdAt: 0,
  };
}

function bundle(partial: Partial<ClassExport> & { from?: string; to?: string }): ExportBundle {
  const from = partial.from ?? '2026-11-23';
  return {
    from,
    to: partial.to ?? from,
    classes: [
      {
        cls: partial.cls ?? cls('PE 10'),
        rubric: partial.rubric ?? rubric(['Skills', 'Teamwork']),
        students: partial.students ?? [],
        sessions: partial.sessions ?? [session(from)],
        assessments: partial.assessments ?? [],
        attendance: partial.attendance ?? [],
      },
    ],
  };
}

describe('latestLevel', () => {
  it('takes the newest entry by createdAt', () => {
    expect(
      latestLevel([
        assessment('s1', 'Skills', 'DV1', 100),
        assessment('s1', 'Skills', 'EX2', 300),
        assessment('s1', 'Skills', 'PR1', 200),
      ]),
    ).toBe('EX2');
  });

  /* Editing an old comment must not promote that older observation. */
  it('ignores updatedAt', () => {
    const old = assessment('s1', 'Skills', 'DV1', 100);
    old.updatedAt = 999_999;
    const newer = assessment('s1', 'Skills', 'EX2', 300);

    expect(latestLevel([old, newer])).toBe('EX2');
  });

  it('is empty when there is nothing', () => {
    expect(latestLevel([])).toBe('');
  });
});

describe('joinComments', () => {
  it('joins in time order with a pipe', () => {
    expect(
      joinComments([
        assessment('s1', 'Skills', 'PR2', 200, 'second'),
        assessment('s1', 'Skills', 'PR2', 100, 'first'),
      ]),
    ).toBe('first | second');
  });

  it('skips empty comments', () => {
    expect(
      joinComments([
        assessment('s1', 'Skills', 'PR2', 100, 'kept'),
        assessment('s1', 'Skills', 'PR2', 200, ''),
        assessment('s1', 'Skills', 'PR2', 300, '   '),
      ]),
    ).toBe('kept');
  });
});

describe('categoryColumns', () => {
  it('follows the rubric order', () => {
    const bea = student('Bea', 'Ruiz');
    const b = bundle({
      students: [bea],
      assessments: [
        assessment(bea.id, 'Teamwork', 'PR1', 200),
        assessment(bea.id, 'Skills', 'PR2', 100),
      ],
    });
    expect(categoryColumns(b)).toEqual(['Skills', 'Teamwork']);
  });

  it('only includes categories that actually have entries', () => {
    const bea = student('Bea', 'Ruiz');
    const b = bundle({
      rubric: rubric(['Skills', 'Teamwork', 'Participation']),
      students: [bea],
      assessments: [assessment(bea.id, 'Skills', 'PR2', 100)],
    });
    expect(categoryColumns(b)).toEqual(['Skills']);
  });

  /* The rename case: columns come from the snapshots, not the rubric, so
     history recorded under an old name keeps its column. */
  it('keeps a renamed category alongside its new name', () => {
    const bea = student('Bea', 'Ruiz');
    const b = bundle({
      rubric: rubric(['Movement Skills', 'Teamwork']),
      students: [bea],
      assessments: [
        assessment(bea.id, 'Skills', 'PR2', 100),
        assessment(bea.id, 'Movement Skills', 'EX1', 200),
      ],
    });
    expect(categoryColumns(b)).toEqual(['Movement Skills', 'Skills']);
  });
});

describe('buildPowerSchoolSheet', () => {
  it('builds the columns SPEC 4.7 asks for', () => {
    const bea = student('Bea', 'Ruiz', '123456');
    const sheet = buildPowerSchoolSheet(
      bundle({
        students: [bea],
        assessments: [assessment(bea.id, 'Skills', 'PR2', 100)],
      }),
    );

    expect(sheet.headers).toEqual([
      'Class',
      'Date(s)',
      'Last Name',
      'First Name',
      'Student Number',
      'Attendance',
      'Skills',
      'Skills Comments',
    ]);
  });

  it('writes one row per student with the latest level and joined comments', () => {
    const bea = student('Bea', 'Ruiz', '123456');
    const sheet = buildPowerSchoolSheet(
      bundle({
        students: [bea],
        attendance: [attendance(bea.id, 'present')],
        assessments: [
          assessment(bea.id, 'Skills', 'DV2', 100, 'shaky start'),
          assessment(bea.id, 'Skills', 'PR2', 200, 'much better'),
        ],
      }),
    );

    expect(sheet.rows).toEqual([
      [
        'PE 10',
        '2026-11-23',
        'Ruiz',
        'Bea',
        '123456',
        'Present',
        'PR2',
        'shaky start | much better',
      ],
    ]);
  });

  it('sorts by last name then first name', () => {
    const a = student('Zoe', 'Adams');
    const b = student('Bea', 'Ruiz');
    const c = student('Alex', 'Ruiz');
    const sheet = buildPowerSchoolSheet({
      ...bundle({ students: [b, a, c] }),
    });

    expect(sheet.rows.map((r) => `${r[2]}, ${r[3]}`)).toEqual([
      'Adams, Zoe',
      'Ruiz, Alex',
      'Ruiz, Bea',
    ]);
  });

  it('writes a single word for a single day', () => {
    const bea = student('Bea', 'Ruiz');
    const sheet = buildPowerSchoolSheet(
      bundle({ students: [bea], attendance: [attendance(bea.id, 'late')] }),
    );
    expect(sheet.rows[0]?.[5]).toBe('Late');
  });

  it('writes Absent for a student with no attendance row', () => {
    const bea = student('Bea', 'Ruiz');
    const sheet = buildPowerSchoolSheet(bundle({ students: [bea] }));
    expect(sheet.rows[0]?.[5]).toBe('Absent');
  });

  it('writes counts across a range', () => {
    const bea = student('Bea', 'Ruiz');
    const sheet = buildPowerSchoolSheet(
      bundle({
        from: '2026-11-23',
        to: '2026-11-27',
        students: [bea],
        sessions: [session('2026-11-23', 'd1'), session('2026-11-24', 'd2'), session('2026-11-25', 'd3')],
        attendance: [attendance(bea.id, 'present', 'd1'), attendance(bea.id, 'late', 'd2')],
      }),
    );

    expect(sheet.rows[0]?.[1]).toBe('2026-11-23 to 2026-11-27');
    expect(sheet.rows[0]?.[5]).toBe('P:1 L:1 A:1');
  });

  /* SPEC 4.7: classes with different rubrics produce a union of columns,
     blank where a category does not apply. */
  it('unions categories across classes and leaves blanks', () => {
    const bea = student('Bea', 'Ruiz');
    const sam = { ...student('Sam', 'Okafor'), classId: 'c2' };

    const sheet = buildPowerSchoolSheet({
      from: '2026-11-23',
      to: '2026-11-23',
      classes: [
        {
          cls: cls('PE 10'),
          rubric: rubric(['Skills']),
          students: [bea],
          sessions: [session('2026-11-23')],
          assessments: [assessment(bea.id, 'Skills', 'PR2', 100)],
          attendance: [attendance(bea.id, 'present')],
        },
        {
          cls: { ...cls('Leadership 30'), id: 'c2' },
          rubric: rubric(['Initiative']),
          students: [sam],
          sessions: [session('2026-11-23')],
          assessments: [assessment(sam.id, 'Initiative', 'EX1', 100)],
          attendance: [attendance(sam.id, 'present')],
        },
      ],
    });

    expect(sheet.headers.slice(6)).toEqual([
      'Skills',
      'Skills Comments',
      'Initiative',
      'Initiative Comments',
    ]);

    const leadership = sheet.rows.find((r) => r[0] === 'Leadership 30');
    const pe = sheet.rows.find((r) => r[0] === 'PE 10');
    expect(leadership?.slice(6)).toEqual(['', '', 'EX1', '']);
    expect(pe?.slice(6)).toEqual(['PR2', '', '', '']);
  });

  it('sorts classes by name', () => {
    const sheet = buildPowerSchoolSheet({
      from: '2026-11-23',
      to: '2026-11-23',
      classes: [
        {
          cls: cls('PE 20'),
          rubric: rubric([]),
          students: [student('A', 'A')],
          sessions: [],
          assessments: [],
          attendance: [],
        },
        {
          cls: { ...cls('Leadership 30'), id: 'c2' },
          rubric: rubric([]),
          students: [student('B', 'B')],
          sessions: [],
          assessments: [],
          attendance: [],
        },
      ],
    });
    expect(sheet.rows.map((r) => r[0])).toEqual(['Leadership 30', 'PE 20']);
  });
});

describe('toCsv', () => {
  it('starts with a BOM so Excel shows accents', () => {
    const csv = toCsv(['First Name'], [['José']]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain('José');
  });

  it('uses CRLF line endings', () => {
    const csv = toCsv(['A', 'B'], [['1', '2']]);
    expect(csv).toBe(`${BOM}A,B\r\n1,2`);
  });

  it('quotes a comma inside a comment', () => {
    const csv = toCsv(['Comment'], [['Great effort, kept going']]);
    expect(csv).toContain('"Great effort, kept going"');
  });

  it('escapes quotes inside a comment', () => {
    const csv = toCsv(['Comment'], [['Said "nice shot"']]);
    expect(csv).toContain('"Said ""nice shot"""');
  });

  it('handles a newline inside a comment', () => {
    const csv = toCsv(['Comment'], [['line one\nline two']]);
    expect(csv).toContain('"line one\nline two"');
  });
});

describe('exportFilename', () => {
  it('uses one date for a single day', () => {
    expect(exportFilename('powerschool', '2026-11-23', '2026-11-23')).toBe(
      'griffin-grader_powerschool_2026-11-23.csv',
    );
  });

  it('uses a span for a range', () => {
    expect(exportFilename('log', '2026-11-23', '2026-11-27')).toBe(
      'griffin-grader_log_2026-11-23_to_2026-11-27.csv',
    );
  });
});

describe('buildFullLogSheet', () => {
  it('writes one row per assessment plus one per student per session', () => {
    const bea = student('Bea', 'Ruiz', '123456');
    const sheet = buildFullLogSheet(
      bundle({
        students: [bea],
        attendance: [attendance(bea.id, 'present')],
        assessments: [assessment(bea.id, 'Skills', 'PR2', 100, 'good')],
      }),
    );

    expect(sheet.headers).toEqual([
      'Date',
      'Time',
      'Class',
      'Last Name',
      'First Name',
      'Student Number',
      'Category',
      'Level',
      'Comment',
    ]);
    // One assessment row and one attendance row.
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows.some((r) => r[6] === 'Skills' && r[7] === 'PR2')).toBe(true);
    expect(sheet.rows.some((r) => r[6] === 'Attendance' && r[7] === 'Present')).toBe(true);
  });

  it('records an absence that has no stored row', () => {
    const bea = student('Bea', 'Ruiz');
    const sheet = buildFullLogSheet(bundle({ students: [bea] }));
    expect(sheet.rows.some((r) => r[6] === 'Attendance' && r[7] === 'Absent')).toBe(true);
  });
});
