// Gallery cards show their caption and expand icon on hover. Keyboard users
// (focus inside the card) and touch screens (no hover at all) never hover, so
// the same parts are revealed for them too.
export const revealOnInteract =
  'group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'

export const slideInOnInteract =
  'group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:none)]:translate-y-0'
