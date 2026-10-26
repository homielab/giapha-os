import { describe, expect, test } from 'bun:test'

import {
  serializeJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd
} from './jsonLd'

describe('websiteJsonLd', () => {
  test('describes the site only', () => {
    const data = websiteJsonLd({ description: 'Desc', locale: 'vi' })
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('WebSite')
    expect(data.description).toBe('Desc')
    expect(data.inLanguage).toBe('vi')
    expect(String(data.url)).toMatch(/^https?:\/\//)
  })
})

describe('softwareApplicationJsonLd', () => {
  test('has the open source app fields', () => {
    const data = softwareApplicationJsonLd({ description: 'D', locale: 'en' })
    expect(data['@type']).toBe('SoftwareApplication')
    expect(data.applicationCategory).toBeTruthy()
    expect(data.inLanguage).toBe('en')
    expect(String(data.url)).toEndWith('/about')
    expect(data.license).toContain('MIT')
    expect(data.codeRepository).toBe('https://github.com/homielab/giapha-os')
  })
})

describe('serializeJsonLd', () => {
  test('escapes < so a value cannot close the script element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })

  test('escapes line separators and round-trips', () => {
    const out = serializeJsonLd({ a: 'x\u2028y\u2029z' })
    expect(out).not.toContain('\u2028')
    expect(out).not.toContain('\u2029')
    expect(JSON.parse(out).a).toBe('x\u2028y\u2029z')
  })
})
