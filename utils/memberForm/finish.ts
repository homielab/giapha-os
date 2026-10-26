import type { MemberFormSubmitContext } from '@/utils/memberForm/types'

// What happens after a save: the caller's onSuccess, or the member's page.
export function finishMemberSave(
  ctx: Pick<MemberFormSubmitContext, 'router' | 'onSuccess'>,
  personId: string
) {
  if (ctx.onSuccess) {
    ctx.onSuccess(personId)
  } else {
    ctx.router.push('/dashboard/members/' + personId)
    ctx.router.refresh()
  }
}
