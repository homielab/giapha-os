// Escape closes the member detail view, but never a form being edited or
// created: that would throw away what was typed.
export function shouldCloseMemberModalOnEscape({
  isEditing,
  showCreateMember
}: {
  isEditing: boolean
  showCreateMember: boolean
}) {
  return !isEditing && !showCreateMember
}
