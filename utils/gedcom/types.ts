export interface GedcomPerson {
  id?: string
  full_name?: string | null
  gender?: 'male' | 'female' | 'other' | string
  birth_year?: number | null
  birth_month?: number | null
  birth_day?: number | null
  death_year?: number | null
  death_month?: number | null
  death_day?: number | null
  /** Lunar date of death (the leap flag is derived from the solar date). */
  death_lunar_day?: number | null
  death_lunar_month?: number | null
  death_lunar_year?: number | null
  /** Other names, comma separated (written as extra NAME records). */
  other_names?: string | null
  is_deceased?: boolean
  is_in_law?: boolean
  birth_order?: number | null
  generation?: number | null
  avatar_url?: string | null
  note?: string | null
  /** Written as `1 BURI` / `2 PLAC <place>`. */
  burial_place?: string | null
}

export interface GedcomRelationship {
  type?: string
  person_a?: string
  person_b?: string
  /** Note of a marriage: the FAM record's `NOTE` (and cited sources on import). */
  note?: string | null
}

/** What a GEDCOM import could not keep, shown before the restore. */
export interface GedcomImportStats {
  /** `NOTE @N1@` pointers to a note record the file does not have. */
  missingNotes: number
  /** SOUR and REPO records; only source titles survive, in notes. */
  sources: number
  /** FAM records with a NOTE or SOUR but without both spouses (no marriage to keep it). */
  droppedFamilyNotes: number
  /** INDI records without a name, saved under the placeholder name. */
  unnamed: number
}
