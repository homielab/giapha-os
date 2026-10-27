export type GedcomEncoding =
  'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252' | 'ansel'

/** `ansel`: ANSEL is read as latin-1, accents may be wrong. `replacement`: text still holds U+FFFD. */
export type GedcomEncodingWarning = 'ansel' | 'replacement'

export interface DecodedGedcom {
  text: string
  encoding: GedcomEncoding
  warning?: GedcomEncodingWarning
}

function declaredCharset(bytes: Uint8Array): string | null {
  // The header is ASCII in every legacy encoding, so latin-1 reads it safely.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048))
  const match = head.match(/^\s*1\s+CHAR\s+([^\s]+)/im)
  return match ? match[1].toUpperCase() : null
}

/**
 * Decodes the bytes of a GEDCOM file: a BOM wins, else the header `1 CHAR`
 * decides (ANSI/ASCII → windows-1252, ANSEL → latin-1 with a warning, else
 * UTF-8). The BOM is dropped from the text.
 */
export function decodeGedcom(buffer: ArrayBuffer): DecodedGedcom {
  const bytes = new Uint8Array(buffer)
  let encoding: GedcomEncoding = 'utf-8'
  let offset = 0
  let warning: GedcomEncodingWarning | undefined

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le'
    offset = 2
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be'
    offset = 2
  } else {
    const charset = declaredCharset(bytes)
    if (charset === 'ANSI' || charset === 'ASCII') encoding = 'windows-1252'
    else if (charset === 'ANSEL') {
      encoding = 'ansel'
      warning = 'ansel'
    }
  }

  const label = encoding === 'ansel' ? 'latin1' : encoding
  const text = new TextDecoder(label).decode(bytes.subarray(offset))
  if (!warning && text.includes('�')) warning = 'replacement'
  return { text, encoding, warning }
}
