export function splitOtherNames(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/[,;\n]/)
    .map((n) => n.replace(/\//g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function formatName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '1 NAME Unknown /Unknown/\n'
  if (parts.length === 1) return `1 NAME ${parts[0]}\n2 GIVN ${parts[0]}\n`
  const [surname, ...rest] = parts
  const given = rest.join(' ')
  return `1 NAME /${surname}/ ${given}\n2 GIVN ${given}\n2 SURN ${surname}\n`
}

/**
 * Full name from a GEDCOM NAME: SURN/GIVN when present, in the order the NAME
 * writes them (surname first for `/Nguyễn/ Văn An`), otherwise the NAME
 * without its slashes (`Văn /An/` → `Văn An`, as older exports wrote it).
 */
export function readName(
  nameValue: string | null,
  surname: string | null,
  givenName: string | null
): string {
  const clean = (s: string) => s.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  const value = nameValue?.trim() ?? ''
  if (surname || givenName) {
    const surnameFirst = value === '' || value.startsWith('/')
    const parts = surnameFirst ? [surname, givenName] : [givenName, surname]
    return clean(parts.filter(Boolean).join(' '))
  }
  return clean(value) || 'Unknown'
}
