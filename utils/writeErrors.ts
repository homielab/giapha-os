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

/** A delete of a person removed no row: the person is gone or the user may not delete it. */
export class PersonNotDeletedError extends Error {
  constructor() {
    super('Person not deleted')
    this.name = 'PersonNotDeletedError'
  }
}

/** Inserting a person returned no row (and no error): the user may not create it. */
export class PersonNotCreatedError extends Error {
  constructor() {
    super('Person not created')
    this.name = 'PersonNotCreatedError'
  }
}

/**
 * A new person was created but linking it failed, and removing it again was
 * refused or failed: the person is left without the intended relationship.
 */
export class PersonOrphanedError extends Error {
  constructor(
    readonly personId: string,
    readonly reason: string
  ) {
    super(`Person ${personId} created but not linked: ${reason}`)
    this.name = 'PersonOrphanedError'
  }
}

/**
 * A person was changed by someone else since the form loaded it: the
 * conditional update on `updated_at` matched no row although the person is
 * still readable. Nothing was written.
 */
export class PersonChangedError extends Error {
  constructor() {
    super('Person changed by someone else')
    this.name = 'PersonChangedError'
  }
}
