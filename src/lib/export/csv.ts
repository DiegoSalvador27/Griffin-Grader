import Papa from 'papaparse';

/**
 * CSV writing for Excel on a school computer (SPEC 4.7).
 *
 * Three things matter and all three are easy to get wrong:
 *   BOM    without it Excel renders José as JosÃ©
 *   CRLF   Excel on Windows expects it
 *   quotes handled by PapaParse, including commas and quotes inside comments
 */

/* Written as an escape, not a literal: a raw U+FEFF is invisible in an editor
   and trivially lost to a stray reformat, which would silently break accents
   in Excel. */
export const BOM = '\uFEFF';

export function toCsv(headers: readonly string[], rows: readonly string[][]): string {
  const body = Papa.unparse([[...headers], ...rows.map((r) => [...r])], {
    newline: '\r\n',
    quotes: false,
  });
  return `${BOM}${body}`;
}

/** `griffin-grader_powerschool_2026-11-23.csv`, or `..._2026-11-23_to_2026-11-27.csv`. */
export function exportFilename(kind: 'powerschool' | 'log', from: string, to: string): string {
  const span = from === to ? from : `${from}_to_${to}`;
  return `griffin-grader_${kind}_${span}.csv`;
}
