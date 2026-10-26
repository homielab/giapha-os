import type { ImportPayload } from '@/utils/backupPayload'

export interface BackupSummary {
  persons: number
  relationships: number
  events: number
  /** Export date (ISO string) when the file records one, else null. */
  exportedAt: string | null
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

/** Parses a restore file (.json, .ged or .zip of CSV files) into a payload. */
export async function parseRestoreFile(file: {
  name: string
  text: () => Promise<string>
}): Promise<ImportPayload> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ged')) {
    const { parseGedcom } = await import('@/utils/gedcom')
    return parseGedcom(await file.text()) as unknown as ImportPayload
  }
  if (name.endsWith('.zip')) {
    const { parseCsvZip } = await import('@/utils/csv')
    return (await parseCsvZip(
      file as unknown as Blob
    )) as unknown as ImportPayload
  }
  try {
    return JSON.parse(await file.text()) as ImportPayload
  } catch {
    throw new BackupParseError('Invalid JSON')
  }
}
