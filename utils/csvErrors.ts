/** The ZIP has no persons.csv or relationships.csv, so it is not a CSV export. */
export class CsvZipInvalidError extends Error {
  constructor() {
    super('Invalid ZIP file: persons.csv or relationships.csv is missing')
    this.name = 'CsvZipInvalidError'
  }
}

/** What is wrong with a CSV file that cannot be read safely. */
export type CsvParseProblem = 'tooFewFields' | 'tooManyFields' | 'brokenQuotes'

/**
 * A CSV file in the ZIP has a row with the wrong number of cells or a broken
 * quote, so its columns cannot be trusted. Thrown before anything is restored.
 */
export class CsvParseError extends Error {
  constructor(
    readonly file: string,
    readonly line: number,
    readonly problem: CsvParseProblem
  ) {
    super(`${file} line ${line}: ${problem}`)
    this.name = 'CsvParseError'
  }
}
