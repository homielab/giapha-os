/**
 * Row-level security hides rows from an UPDATE or DELETE without raising an
 * error, so the query succeeds with zero rows. These errors name that case so
 * the UI can tell the user the change was not saved.
 */

/** An update changed no row: the person is gone or the user may no longer edit it. */
export class PersonNotUpdatedError extends Error {
  constructor() {
    super('Person not updated')
    this.name = 'PersonNotUpdatedError'
  }
}

/** A delete removed no row: the relationship is gone or the user may not delete it. */
export class RelationshipNotDeletedError extends Error {
  constructor() {
    super('Relationship not deleted')
    this.name = 'RelationshipNotDeletedError'
  }
}

/** An update of a gallery item changed no row. */
export class GalleryItemNotUpdatedError extends Error {
  constructor() {
    super('Gallery item not updated')
    this.name = 'GalleryItemNotUpdatedError'
  }
}
