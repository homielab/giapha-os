/**
 * Supabase (PostgREST) caps every response at `max_rows` (1000 by default),
 * so a plain `.select()` silently drops everything after row 1000. Large
 * family trees easily exceed that, which breaks parent/child mapping.
 *
 * `fetchAllRows` pages through a query with `.range()` until every row has
 * been read. The first page is read alone, so a tree that fits in one page
 * costs one round trip; when it is full, the next pages are requested
 * `PARALLEL_PAGES` at a time and joined in page order, stopping at the first
 * short or empty page. The query MUST have a deterministic order (end it with
 * a unique column such as `id`), otherwise rows can be skipped or duplicated
 * between pages.
 *
 * @example
 * const { data, error } = await fetchAllRows((from, to) =>
 *   supabase
 *     .from('persons')
 *     .select('*')
 *     .order('birth_year', { ascending: true, nullsFirst: false })
 *     .order('id')
 *     .range(from, to)
 * )
 */

export const SUPABASE_PAGE_SIZE = 1000

/** Pages requested at once after a full first page. */
export const PARALLEL_PAGES = 4

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

async function loadPage<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  page: number,
  pageSize: number
): Promise<PageResult<T>> {
  const from = page * pageSize
  try {
    return await buildPage(from, from + pageSize - 1)
  } catch (err) {
    return { data: null, error: { message: errorMessage(err) } }
  }
}

/**
 * Returns every row, or the rows of the pages before the first failed one
 * together with that page's error.
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  let batch: Promise<PageResult<T>>[] = [loadPage(buildPage, 0, pageSize)]
  let nextPage = 1

  while (true) {
    for (const { data, error } of await Promise.all(batch)) {
      if (error) return { data: rows, error }
      if (!data || data.length === 0) return { data: rows, error: null }
      rows.push(...data)
      if (data.length < pageSize) return { data: rows, error: null }
    }

    batch = Array.from({ length: PARALLEL_PAGES }, (_, i) =>
      loadPage(buildPage, nextPage + i, pageSize)
    )
    nextPage += PARALLEL_PAGES
  }
}

/**
 * Runs `fn` over `items` in fixed-size chunks and concatenates the results.
 * Use for `.in('id', ids)` filters: a long id list both overflows the URL
 * and is itself subject to the 1000-row response cap.
 */
export async function fetchInChunks<I, T>(
  items: I[],
  fn: (chunk: I[]) => PromiseLike<PageResult<T>>,
  chunkSize = 200
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const { data, error } = await fn(items.slice(i, i + chunkSize))
    if (error) return { data: rows, error }
    if (data) rows.push(...data)
  }
  return { data: rows, error: null }
}

/**
 * Like `fetchAllRows`, but throws when any page fails. Use it where a partial
 * list would be shown or acted on as if it were the whole family (dashboard
 * pages): the route's error boundary then asks the user to try again.
 */
export async function fetchAllRowsOrThrow<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<{ data: T[] }> {
  const { data, error } = await fetchAllRows(buildPage, pageSize)
  if (error) throw new Error(`Could not load all rows: ${error.message}`)
  return { data }
}
