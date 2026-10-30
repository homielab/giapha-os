import type { Metadata } from 'next'
import Link from 'next/link'

import PrintButton from '@/components/PrintButton'
import { getServerTranslations } from '@/lib/i18n/server'
import { Relationship } from '@/types'
import { vnToday } from '@/utils/dateHelpers'
import {
  BOOK_PERSON_COLUMNS,
  buildLineageBook,
  formatSolarDate,
  type BookEntry,
  type LineageBookPerson
} from '@/utils/lineageBook'
import { RELATIONSHIP_COLUMNS } from '@/utils/personColumns'
import { fetchAllRowsOrThrow } from '@/utils/supabase/fetchAll'
import { getSupabase } from '@/utils/supabase/queries'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('lineageBookTitle') }
}

const PARENT_LABELS = {
  father: 'lineageBookFather',
  mother: 'lineageBookMother',
  parent: 'lineageBookParent'
} as const

const SPOUSE_LABELS = {
  wife: 'lineageBookWife',
  husband: 'lineageBookHusband',
  spouse: 'lineageBookSpouse'
} as const

/** Page-break before every generation: the cover/contents stay on page 1. */
const sectionClass = 'break-before-page space-y-4'

export default async function LineageBookPage() {
  const { t } = await getServerTranslations()
  const supabase = await getSupabase()

  const [{ data: personsData }, { data: relsData }] = await Promise.all([
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('persons')
        .select(BOOK_PERSON_COLUMNS)
        .order('birth_year', { ascending: true, nullsFirst: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRowsOrThrow((from, to) =>
      supabase
        .from('relationships')
        .select(RELATIONSHIP_COLUMNS)
        .order('created_at')
        .order('id')
        .range(from, to)
    )
  ])

  // BOOK_PERSON_COLUMNS ('*') covers everything the book renders.
  const persons = (personsData || []) as unknown as LineageBookPerson[]
  // RELATIONSHIP_COLUMNS leaves out note/updated_at; no view reads them.
  const relationships = (relsData || []) as unknown as Relationship[]

  const book = buildLineageBook(persons, relationships)
  const title = book.surname
    ? t('lineageBookTitleSurname', { surname: book.surname })
    : t('lineageBookTitle')

  const today = vnToday()
  const printedOn = t('lineageBookPrintedOn', {
    date: `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
  })
  const toc = [
    ...book.generations.map((g) => ({
      href: `#gen-${g.generation}`,
      label: t('lineageBookGeneration', { n: g.generation }),
      count: g.entries.length
    })),
    ...(book.unknown.length
      ? [
          {
            href: '#gen-unknown',
            label: t('lineageBookUnknownGeneration'),
            count: book.unknown.length
          }
        ]
      : [])
  ]

  const dates = (
    person: LineageBookPerson,
    deathLunar: BookEntry['deathLunar'],
    burialPlace: string | null
  ) => {
    const born = formatSolarDate(
      person.birth_year,
      person.birth_month,
      person.birth_day
    )
    const died = formatSolarDate(
      person.death_year,
      person.death_month,
      person.death_day
    )
    const lunar = deathLunar
      ? `${deathLunar.day}/${deathLunar.month}${deathLunar.leap ? t('leapMonth') : ''}${t('lunarSuffix')}`
      : null
    return [
      born ? t('lineageBookBorn', { date: born }) : null,
      died ? t('lineageBookDied', { date: died }) : null,
      lunar ? t('lineageBookDeathLunar', { date: lunar }) : null,
      burialPlace ? t('lineageBookBuried', { place: burialPlace }) : null
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const entry = (e: (typeof book.unknown)[number]) => {
    const p = e.person
    return (
      <article
        key={p.id}
        id={`person-${p.id}`}
        className='break-inside-avoid border-b border-stone-200/70 pb-4'>
        <h3 className='text-base font-semibold text-stone-900'>
          {e.ordinal}. {p.full_name}{' '}
          {p.is_in_law && (
            <span className='font-normal text-stone-500'>
              {t('lineageBookInLaw')}
            </span>
          )}
        </h3>
        {p.other_names && (
          <p className='mt-0.5 text-sm text-stone-500'>
            {t('lineageBookOtherNames', { names: p.other_names })}
          </p>
        )}
        {dates(p, e.deathLunar, e.burialPlace) && (
          <p className='mt-1 text-sm text-stone-600'>
            {dates(p, e.deathLunar, e.burialPlace)}
          </p>
        )}
        {e.parents.length > 0 && (
          <p className='mt-1 text-sm text-stone-600'>
            <span className='font-medium text-stone-800'>
              {t('lineageBookParents')}:{' '}
            </span>
            {e.parents
              .map((x) => `${t(PARENT_LABELS[x.label])} ${x.person.full_name}`)
              .join(', ')}
          </p>
        )}
        {e.spouses.length > 0 && (
          <p className='mt-1 text-sm text-stone-600'>
            <span className='font-medium text-stone-800'>
              {t('lineageBookSpouses')}:{' '}
            </span>
            {e.spouses
              .map(
                (x) =>
                  `${t(SPOUSE_LABELS[x.label])} ${x.person.full_name}${
                    x.inLaw ? ` ${t('lineageBookInLaw')}` : ''
                  }`
              )
              .join(', ')}
          </p>
        )}
        {e.children.length > 0 && (
          <p className='mt-1 text-sm text-stone-600'>
            <span className='font-medium text-stone-800'>
              {t('lineageBookChildren')}:{' '}
            </span>
            {e.children.map((x, i) => (
              <span key={x.person.id}>
                {i > 0 && ', '}
                <a
                  href={`#person-${x.person.id}`}
                  className='underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600'>
                  {x.person.full_name}
                </a>
                {x.adopted && ` ${t('lineageBookAdopted')}`}
              </span>
            ))}
          </p>
        )}
        {p.note && (
          <p className='mt-1 text-sm whitespace-pre-line text-stone-600'>
            {p.note}
          </p>
        )}
      </article>
    )
  }

  return (
    <main className='relative flex w-full flex-1 flex-col overflow-auto bg-stone-50/50 pt-8'>
      <div className='relative z-10 mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6'>
        <div className='mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
          <div>
            <h1 className='title'>{title}</h1>
            <p className='mt-2 max-w-2xl text-sm text-stone-500'>
              {t('lineageBookDescription')}
            </p>
          </div>
          {persons.length > 0 && <PrintButton title={title} />}
        </div>

        {persons.length === 0 ? (
          <p className='text-sm text-stone-500'>{t('lineageBookEmpty')}</p>
        ) : (
          <div className='rounded-2xl border border-stone-200/60 bg-white/80 p-6'>
            <p className='text-xs text-stone-500'>{printedOn}</p>
            <nav aria-label={t('lineageBookToc')} className='mt-2'>
              <h2 className='text-sm font-semibold text-stone-800'>
                {t('lineageBookToc')}
              </h2>
              <ul className='mt-1 text-sm text-stone-600'>
                {toc.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className='underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600'>
                      {item.label}
                    </a>{' '}
                    — {t('lineageBookMembers', { count: item.count })}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {book.generations.map((g) => (
          <section
            key={g.generation}
            id={`gen-${g.generation}`}
            className={sectionClass}>
            <h2 className='text-xl font-semibold text-stone-900'>
              {t('lineageBookGeneration', { n: g.generation })}
            </h2>
            <div className='space-y-4'>{g.entries.map(entry)}</div>
          </section>
        ))}

        {book.unknown.length > 0 && (
          <section id='gen-unknown' className={sectionClass}>
            <h2 className='text-xl font-semibold text-stone-900'>
              {t('lineageBookUnknownGeneration')}
            </h2>
            <div className='space-y-4'>{book.unknown.map(entry)}</div>
          </section>
        )}

        <p className='mt-10 text-sm print:hidden'>
          <Link
            href='/dashboard/lineage'
            className='font-medium text-amber-700 hover:underline'>
            {t('lineagePageTitle')}
          </Link>
        </p>
      </div>
    </main>
  )
}
