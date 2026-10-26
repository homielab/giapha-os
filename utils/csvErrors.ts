/** The ZIP has no persons.csv or relationships.csv, so it is not a CSV export. */
export class CsvZipInvalidError extends Error {
  constructor() {
    super('Invalid ZIP file: persons.csv or relationships.csv is missing')
    this.name = 'CsvZipInvalidError'
  }
}
