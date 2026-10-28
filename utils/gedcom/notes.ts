// GEDCOM notes: inline (`1 NOTE text`) or a pointer (`1 NOTE @N1@`) to a
// shared record (`0 @N1@ NOTE text`, GEDCOM 7: `SNOTE`) used by Gramps,
// Family Tree Maker, Legacy and Ancestry.

export const MAX_LINE_LENGTH = 255

const POINTER = /^@[^@]+@$/

export function isNotePointer(value: string): boolean {
  return POINTER.test(value.trim())
}

// Text of a record: the value on its `0` line plus its level-1 CONC/CONT lines.
export function readNoteRecord(first: string, lines: string[]): string {
  let text = first
  for (const line of lines) {
    const match = line.match(/^1\s+(CONC|CONT)(?:\s(.*))?$/)
    if (!match) continue
    text += (match[1] === 'CONT' ? '\n' : '') + (match[2] ?? '')
  }
  return text
}

// Splits text into GEDCOM lines for `tag` at `level`: line breaks become CONT,
// lines longer than 255 characters continue on CONC lines (never splitting a
// surrogate pair). Continuation lines are one level deeper.
export function noteLines(level: number, tag: string, text: string): string {
  const next = level + 1
  // Room for the "<level> CONC " prefix of a continuation line.
  const size = MAX_LINE_LENGTH - String(next).length - 6
  let out = ''
  text.split('\n').forEach((paragraph, index) => {
    const chars = Array.from(paragraph)
    let start = 0
    do {
      const chunk = chars.slice(start, start + size).join('')
      if (index === 0 && start === 0) out += `${level} ${tag} ${chunk}\n`
      else if (start === 0) out += `${next} CONT ${chunk}\n`
      else out += `${next} CONC ${chunk}\n`
      start += size
    } while (start < chars.length)
  })
  return out
}
