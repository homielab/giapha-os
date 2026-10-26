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
  /** Lunar date of death; `death_lunar_leap` is only carried by GEDCOM files. */
  death_lunar_day?: number | null
  death_lunar_month?: number | null
  death_lunar_year?: number | null
  death_lunar_leap?: boolean
  /** Other names, comma separated (written as extra NAME records). */
  other_names?: string | null
  is_deceased?: boolean
  is_in_law?: boolean
  birth_order?: number | null
  generation?: number | null
  avatar_url?: string | null
  note?: string | null
}

export interface GedcomRelationship {
  type?: string
  person_a?: string
  person_b?: string
}
