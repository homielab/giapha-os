/**
 * Supabase (PostgREST) caps every response at `max_rows` (1000 by default),
 * so a plain `.select()` silently drops everything after row 1000. Large
 * family trees easily exceed that, which breaks parent/child mapping.
 *
 * `fetchAllRows` pages through a query with `.range()` until every row has
 * been read. The query MUST have a deterministic order (end it with a unique
 * column such as `id`), otherwise rows can be skipped or duplicated between
 * pages.
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

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  let from = 0

  try {
    while (true) {
      const { data, error } = await buildPage(from, from + pageSize - 1)
      if (error) return { data: rows, error }
      if (!data || data.length === 0) break

      rows.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { data: rows, error: { message } }
  }

  return { data: rows, error: null }
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
