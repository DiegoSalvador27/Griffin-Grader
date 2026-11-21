import type {
  Assessment,
  Attendance,
  ClassGroup,
  Rubric,
  Session,
  Student,
} from '../../db/types';

/** Everything one class contributes to an export, already narrowed to the range. */
export interface ClassExport {
  cls: ClassGroup;
  rubric: Rubric | undefined;
  students: Student[];
  sessions: Session[];
  assessments: Assessment[];
  attendance: Attendance[];
}

export interface ExportBundle {
  from: string;
  to: string;
  classes: ClassExport[];
}

export interface Sheet {
  headers: string[];
  rows: string[][];
}
