export type TranslationValues = Record<string, string | number>

// Replaces every `{name}` in the template with its value. A replacer function
// keeps the value literal, so names containing `$&` or `$1` show as typed.
export function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template
  return template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  )
}
