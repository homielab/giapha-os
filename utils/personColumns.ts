/**
 * Person columns the members and lineage views read. `note` and `created_at`
 * are left out: no list, tree or mindmap view uses them. `updated_at` is kept
 * because the members list sorts by it ("Recently updated"). The member detail
 * and edit pages still load the whole row.
 */
export const PERSON_LIST_COLUMNS =
  'id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, updated_at'

/** Columns of the relationship picker's name list. */
export const PERSON_PICKER_COLUMNS =
  'id, full_name, gender, birth_year, birth_month, birth_day, other_names'

/**
 * Relationship columns the members and lineage views read: only the links.
 * `note`, `created_at` and `updated_at` are left out (the detail modal, the
 * member page and the edit form still load the whole row).
 */
export const RELATIONSHIP_COLUMNS = 'id, type, person_a, person_b, created_at'
