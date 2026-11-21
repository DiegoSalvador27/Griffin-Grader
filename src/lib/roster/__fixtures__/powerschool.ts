/**
 * Plausible PowerSchool exports.
 *
 * IMPORTANT: these are GUESSES, not real exports. Nobody has seen a real
 * PowerSchool roster download yet (SPEC 4.3). They exist to keep the column
 * mapper forgiving across a spread of likely header spellings. When a real
 * export turns up, add it here and fix whatever breaks.
 */

export const SPLIT_NAMES = `Student Number,Last Name,First Name
123456,Ruiz,Bea
123457,Torres,José
123458,O'Neil,Cam`;

export const ODD_CASING = `STUDENT_NUMBER,LASTNAME,FIRSTNAME
123456,Ruiz,Bea
123457,Torres,José`;

export const FULL_NAME_COLUMN = `Student Name,Student Number
"Ruiz, Bea",123456
"Torres, José",123457`;

export const FIRST_LAST_IN_ONE_COLUMN = `Name
Bea Ruiz
José Torres`;

export const EXTRA_COLUMNS = `Student Number,Last Name,First Name,Grade Level,Home Room,Gender
123456,Ruiz,Bea,10,A12,F
123457,Torres,José,10,A12,M`;

export const NO_HEADER = `Bea,Ruiz
José,Torres`;

export const BLANK_ROWS = `Student Number,Last Name,First Name
123456,Ruiz,Bea

123457,Torres,José
`;

export const COMMA_IN_NAME = `Student Number,Student Name
123456,"Ruiz, Bea"
123457,"St. John, Mary-Kate"`;
