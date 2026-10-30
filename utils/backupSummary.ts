import type { ImportPayload } from '@/utils/backupPayload'
import type { GedcomImportStats } from '@/utils/gedcom'
import type { GedcomEncodingWarning } from '@/utils/gedcom/encoding'
import { clipImportedText } from '@/utils/limits'

export interface BackupSummary {
  persons: number
  relationships: number
  events: number
  /** Export date (ISO string) when the file records one, else null. */
  exportedAt: string | null
}

/**
 * The export date for display, in Vietnam time like every other date in the
 * app, so it matches the file name whatever the browser's time zone.
 * Returns '' when the date is missing or invalid.
 */
export function formatExportedAt(
  iso: string | null | undefined,
  locale: string
): string {
  if (!iso) return ''
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return ''
  return new Date(time).toLocaleDateString(locale, {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
}

/** Thrown when the file text is not valid JSON. */
export class BackupParseError extends Error {}

/**
 * What a restore file holds, counted from the parsed payload. Returns null
 * when it has no `persons` and `relationships` lists (not a backup at all).
 */
export function summarizeBackup(payload: unknown): BackupSummary | null {
  if (!payload || typeof payload !== 'object') return null
  const { persons, relationships, custom_events, timestamp } =
    payload as Record<string, unknown>
  if (!Array.isArray(persons) || !Array.isArray(relationships)) return null

  const time = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN
  return {
    persons: persons.length,
    relationships: relationships.length,
    events: Array.isArray(custom_events) ? custom_events.length : 0,
    exportedAt: Number.isNaN(time) ? null : new Date(time).toISOString()
  }
}

/** Why a .ged file's text may be wrong; shown in the restore confirmation. */
export type RestoreWarning = GedcomEncodingWarning

export interface RestoreFile {
  name: string
  text: () => Promise<string>
  arrayBuffer: () => Promise<ArrayBuffer>
}

/**
 * Reads a restore file (.json, .ged or .zip of CSV files) into a payload,
 * plus an encoding warning for a GEDCOM that could not be decoded cleanly.
 */
export async function readRestoreFile(
  file: Pick<RestoreFile, 'name'> & Partial<RestoreFile>,
  /**
   * GEDCOM only: full names surname first (default true) and the name of a
   * person without one (default 'Unknown').
   */
  options: { surnameFirst?: boolean; unnamedName?: string } = {}
): Promise<{
  payload: ImportPayload
  warning?: RestoreWarning
  /** Values of a GEDCOM/CSV file that were cut to the length limits. */
  truncated?: number
  /** What a GEDCOM file holds that the import drops (notes, sources). */
  gedcom?: GedcomImportStats
}> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ged')) {
    const [{ parseGedcom, decodeGedcom }, buffer] = await Promise.all([
      import('@/utils/gedcom'),
      file.arrayBuffer!()
    ])
    const { text, warning } = decodeGedcom(buffer)
    const { stats, ...parsed } = parseGedcom(text, options)
    const payload = parsed as unknown as ImportPayload
    return {
      payload,
      warning,
      truncated: clipImportedText(payload),
      gedcom: stats
    }
  }
  if (name.endsWith('.zip')) {
    const { parseCsvZip } = await import('@/utils/csv')
    const payload = (await parseCsvZip(
      file as unknown as Blob
    )) as unknown as ImportPayload
    return { payload, truncated: clipImportedText(payload) }
  }
  try {
    return { payload: JSON.parse(await file.text!()) as ImportPayload }
  } catch {
    throw new BackupParseError('Invalid JSON')
  }
}

/** Like `readRestoreFile`, payload only. */
export async function parseRestoreFile(
  file: Pick<RestoreFile, 'name'> & Partial<RestoreFile>
): Promise<ImportPayload> {
  return (await readRestoreFile(file)).payload
}
