// GEDCOM notes: inline (`1 NOTE text`) or a pointer (`1 NOTE @N1@`) to a
// shared record (`0 @N1@ NOTE text`, GEDCOM 7: `SNOTE`) used by Gramps,
// Family Tree Maker, Legacy and Ancestry.

export const MAX_LINE_LENGTH = 255

const POINTER = /^@[^@]+@$/

// A text value starting with '@' would read as a pointer: GEDCOM writes it as
// '@@' (5.5.1 and 7.0). Readers turn '@@' back into '@'.
export function escapeValue(value: string): string {
  return value.startsWith('@') ? '@' + value : value
}

// Undoes the '@@' escape in the value of a GEDCOM line. Pointers and
// `@#D...@` calendar escapes never contain '@@', so they are left as they are.
// A value like '@@N1@' would turn into a pointer: it is kept escaped and the
// note reader unescapes it as text.
export function unescapeLine(line: string): string {
  if (!line.includes('@@')) return line
  const match = line.match(/^(\s*\d+\s+(?:@[^@]+@\s+)?[A-Za-z0-9_]+\s)(.*)$/)
  if (!match) return line
  if (/^@@[^@]+@\s*$/.test(match[2])) return line
  return match[1] + match[2].replace(/@@/g, '@')
}

// The escaped text '@@N1@' left by unescapeLine.
function unescapeLeading(value: string): string {
  return value.startsWith('@@') ? value.slice(1) : value
}

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
// surrogate pair). Continuation lines are one level deeper; a line starting
// with '@' is escaped as '@@'.
export function noteLines(level: number, tag: string, text: string): string {
  const next = level + 1
  // Room for the "<level> CONC " prefix of a continuation line and an '@'
  // escape.
  const size = MAX_LINE_LENGTH - String(next).length - 7
  let out = ''
  text.split('\n').forEach((paragraph, index) => {
    const chars = Array.from(paragraph)
    let start = 0
    do {
      const chunk = escapeValue(chars.slice(start, start + size).join(''))
      if (index === 0 && start === 0) out += `${level} ${tag} ${chunk}\n`
      else if (start === 0) out += `${next} CONT ${chunk}\n`
      else out += `${next} CONC ${chunk}\n`
      start += size
    } while (start < chars.length)
  })
  return out
}

// Collects the NOTE values of one INDI or FAM record: an inline `1 NOTE text`
// continued by its `2 CONC`/`2 CONT` lines, or a `1 NOTE @N1@` pointer
// resolved through `noteTexts`. A pointer to a missing record gives an empty
// note and counts in `stats.missingNotes`.
export function createNoteReader(
  noteTexts: Map<string, string>,
  stats: { missingNotes: number }
) {
  const notes: string[] = []
  let inline = false
  return {
    notes,
    // A level-1 NOTE line (its value with spaces kept).
    start(value: string) {
      inline = !isNotePointer(value)
      const text = inline
        ? unescapeLeading(value)
        : noteTexts.get(value.trim().slice(1, -1))
      if (text === undefined) stats.missingNotes++
      notes.push(text ?? '')
    },
    // A level-2 line under the last NOTE; only inline notes continue.
    continue(tag: string, value: string) {
      if (!inline) return
      if (tag === 'CONT') notes[notes.length - 1] += '\n' + value
      else if (tag === 'CONC') notes[notes.length - 1] += value
    }
  }
}
