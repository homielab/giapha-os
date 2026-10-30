export function splitOtherNames(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/[,;\n]/)
    .map((n) => n.replace(/\//g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/**
 * GEDCOM NAME lines for a full name: the first word is the surname (between
 * slashes), the rest the given name. A `/` inside the name would read as a
 * surname delimiter elsewhere, so it becomes a space first.
 */
export function formatName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '')
    .replace(/\//g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '1 NAME Unknown /Unknown/\n'
  if (parts.length === 1) return `1 NAME ${parts[0]}\n2 GIVN ${parts[0]}\n`
  const [surname, ...rest] = parts
  const given = rest.join(' ')
  return `1 NAME /${surname}/ ${given}\n2 GIVN ${given}\n2 SURN ${surname}\n`
}

/**
 * Full name from a GEDCOM NAME.
 *
 * `surnameFirst` (Vietnamese order) puts the surname first whatever order the
 * file uses: SURN or the `/…/` part of NAME, then GIVN or the rest of NAME, so
 * `Văn An /Nguyễn/` → `Nguyễn Văn An`.
 *
 * Without it: SURN/GIVN in the order the NAME writes them (surname first for
 * `/Nguyễn/ Văn An`), otherwise the NAME without its slashes (`Văn /An/` →
 * `Văn An`, as older exports wrote it).
 *
 * Returns '' when the record has no name; the caller picks the placeholder.
 */
export function readName(
  nameValue: string | null,
  surname: string | null,
  givenName: string | null,
  surnameFirst = false
): string {
  const clean = (s: string) => s.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  const value = nameValue?.trim() ?? ''
  if (surnameFirst) {
    const match = value.match(/\/([^/]*)\//)
    const surn = surname ?? match?.[1] ?? ''
    const given = givenName ?? (match ? value.replace(match[0], ' ') : value)
    return clean(`${surn} ${given}`)
  }
  if (surname || givenName) {
    const surnameFirstInName = value === '' || value.startsWith('/')
    const parts = surnameFirstInName
      ? [surname, givenName]
      : [givenName, surname]
    return clean(parts.filter(Boolean).join(' '))
  }
  return clean(value)
}
