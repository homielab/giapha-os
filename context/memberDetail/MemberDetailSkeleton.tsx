// Placeholders with the size and place of the real member view, so nothing
// moves when the data arrives. motion-safe: no pulsing for reduced motion.

const BLOCK = 'rounded-md bg-stone-200/70 motion-safe:animate-pulse'

/** The whole member view while the member loads (dialog). */
export function MemberDetailSkeleton({ label }: { label: string }) {
  return (
    <div role='status' className='flex-1 overflow-hidden bg-stone-50/50'>
      <span className='sr-only'>{label}</span>
      {/* Cover and avatar, as MemberDetailCover */}
      <div className='relative h-28 bg-stone-100 sm:h-36' aria-hidden='true'>
        <div className='absolute -bottom-12 left-6 size-24 rounded-full border-4 border-white bg-stone-200 motion-safe:animate-pulse sm:-bottom-16 sm:left-8 sm:size-32 sm:border-[6px]' />
      </div>
      <div className='px-6 pt-16 pb-8 sm:px-8 sm:pt-20' aria-hidden='true'>
        {/* Name, as MemberNameHeader */}
        <div className={`h-8 w-64 max-w-full sm:h-9 ${BLOCK}`} />
        {/* Birth, death and age cards, as MemberInfoCards */}
        <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3'>
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
          <DescendantsSkeleton />
        </div>
        <div className='mt-8 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3'>
          <div className='space-y-4 lg:col-span-2'>
            <div className={`h-6 w-32 ${BLOCK}`} />
            <div className='rounded-2xl border border-stone-200/60 bg-white p-4 sm:p-6'>
              <FamilySkeleton />
            </div>
          </div>
          <div className='h-40 rounded-2xl border border-stone-200/60 bg-white' />
        </div>
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className='rounded-2xl border border-stone-200/60 bg-white p-4'>
      <div className={`h-4 w-20 ${BLOCK}`} />
      <div className={`mt-3 h-4 w-28 ${BLOCK}`} />
      <div className={`mt-3 h-6 w-36 ${BLOCK}`} />
    </div>
  )
}

/** The descendants card while the family counts load. */
export function DescendantsSkeleton() {
  return (
    <div
      className='rounded-2xl border border-stone-200/60 bg-white p-4 sm:col-span-2 md:col-span-3'
      aria-hidden='true'>
      <div className={`mb-3 h-5 w-24 ${BLOCK}`} />
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-20 rounded-xl ${BLOCK}`} />
        ))}
      </div>
    </div>
  )
}

/** A few relative rows while the family list loads. */
export function FamilySkeleton() {
  return (
    <div className='space-y-4' aria-hidden='true'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='flex items-center gap-3'>
          <div className='size-10 shrink-0 rounded-full bg-stone-200/70 motion-safe:animate-pulse' />
          <div className='flex-1 space-y-2'>
            <div className={`h-4 w-40 max-w-full ${BLOCK}`} />
            <div className={`h-3.5 w-24 ${BLOCK}`} />
          </div>
        </div>
      ))}
    </div>
  )
}
