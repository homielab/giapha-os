/**
 * A step after the person row was updated failed. The update itself went
 * through and moved `updated_at`, so the form must keep `savedUpdatedAt` as
 * its new reference or its next save would look like someone else's edit.
 */
export class LaterStepError extends Error {
  constructor(
    readonly original: unknown,
    readonly savedUpdatedAt: string | undefined
  ) {
    super(errorMessage(original))
    this.name = 'LaterStepError'
  }
}

export function errorMessage(err: unknown) {
  return (err as { message?: string } | null)?.message || String(err)
}

/** The chosen avatar file is not a JPEG, PNG, GIF or WebP image. */
export class InvalidAvatarError extends Error {
  constructor() {
    super('Avatar file is not a supported image')
    this.name = 'InvalidAvatarError'
  }
}
