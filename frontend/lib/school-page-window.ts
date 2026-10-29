/** Server /schools pagination is fixed at 20 rows. Aggregate windows client-side without changing the API. */
export const SCHOOL_API_PAGE_SIZE = 20;
export const SCHOOL_ROWS_PER_PAGE = [10, 20, 50] as const;

export function schoolPageWindow(
  page: number,
  pageSize: number,
  apiPageSize = SCHOOL_API_PAGE_SIZE,
) {
  if (![page, pageSize, apiPageSize].every(x => Number.isSafeInteger(x) && x > 0)) {
    throw new RangeError('Pagination values must be positive integers.');
  }
  const start = (page - 1) * pageSize;
  if (!Number.isSafeInteger(start + pageSize)) {
    throw new RangeError('Requested school page exceeds the safe range.');
  }
  return {
    firstApiPage: Math.floor(start / apiPageSize) + 1,
    lastApiPage: Math.floor((start + pageSize - 1) / apiPageSize) + 1,
    offsetWithinFirstPage: start % apiPageSize,
  };
}

export function composeSchoolPage<T>(
  responses: ReadonlyArray<{ data: T[]; total: number }>,
  offsetWithinFirstPage: number,
  pageSize: number,
): { data: T[]; total: number } {
  if (!responses.length) throw new RangeError('At least one API page is required.');
  return {
    data: responses.flatMap(response => response.data).slice(offsetWithinFirstPage, offsetWithinFirstPage + pageSize),
    total: responses[0].total,
  };
}
