export type ParseRecord = {
  type: 'INDI' | 'FAM' | 'NOTE'
  id: string
  // Value on the `0` line (the text of a NOTE record).
  first: string
  lines: string[]
}

// Groups the lines of a GEDCOM file into INDI, FAM and NOTE/SNOTE records.
export function readRecords(lines: string[]): ParseRecord[] {
  const records: ParseRecord[] = []
  let currentRecord: ParseRecord | null = null

  for (const line of lines) {
    if (line.startsWith('0 ')) {
      if (currentRecord) records.push(currentRecord)
      const match = line.match(
        /^0\s+@([^@]+)@\s+(INDI|FAM|NOTE|SNOTE)(?:\s(.*))?$/
      )
      if (match) {
        currentRecord = {
          id: match[1],
          type: match[2] === 'SNOTE' ? 'NOTE' : (match[2] as 'INDI' | 'FAM'),
          first: match[3] ?? '',
          lines: []
        }
      } else {
        currentRecord = null
      }
    } else if (currentRecord) {
      // Keep trailing spaces: a CONC line may end with a word break.
      currentRecord.lines.push(line.trimStart())
    }
  }
  if (currentRecord) records.push(currentRecord)
  return records
}
