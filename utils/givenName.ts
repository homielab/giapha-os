const collator = new Intl.Collator('vi')

/** The given name: the last word of a Vietnamese full name ("Nguyễn Văn An" → "An"). */
export function givenName(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  return words[words.length - 1] ?? ''
}

/** Compares by given name first, then by the whole name, in Vietnamese order. */
export function compareByGivenName(a: string, b: string): number {
  return collator.compare(givenName(a), givenName(b)) || collator.compare(a, b)
}
