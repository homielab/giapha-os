export type TranslationValues = Record<string, string | number>

// Replaces every `{name}` in the template with its value. A replacer function
// keeps the value literal, so names containing `$&` or `$1` show as typed.
export function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template
  return template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  )
}

const pluralRules = new Map<string, Intl.PluralRules>()

function pluralCategory(locale: string, count: number) {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules.select(count)
}

// Looks up `key` and fills in `values`. When `values.count` is a number whose
// plural category is 'one' (English 1) and the dictionary has `<key>_one`,
// that singular form is used instead of the plural text of `key`.
export function translateWith(
  dictionary: Readonly<Record<string, string>>,
  locale: string,
  key: string,
  values?: TranslationValues
) {
  const count = values?.count
  if (typeof count === 'number' && pluralCategory(locale, count) === 'one') {
    const singular = dictionary[`${key}_one`]
    if (singular !== undefined) return interpolate(singular, values)
  }
  return interpolate(dictionary[key], values)
}
