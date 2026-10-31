/**
 * Loads the complete list of unassigned schools using the backend's supported
 * page sizes. The allocation dialog is not a paginated table: it needs every
 * selectable school, not only the first API page.
 */
export const ALLOCATION_SCHOOL_PAGE_SIZE = 50;

export type AllocationSchoolPage<T> = { data: T[]; total: number };

export async function loadAllocationSchools<T extends { id: number }>(
  fetchPage: (page: number, pageSize: number) => Promise<AllocationSchoolPage<T>>,
): Promise<AllocationSchoolPage<T>> {
  const first = await fetchPage(1, ALLOCATION_SCHOOL_PAGE_SIZE);
  if (!Number.isSafeInteger(first.total) || first.total < 0 || !Array.isArray(first.data)) {
    throw new Error('Dữ liệu danh sách trường không hợp lệ.');
  }
  const pages: AllocationSchoolPage<T>[] = [first];
  const totalPages = Math.ceil(first.total / ALLOCATION_SCHOOL_PAGE_SIZE);

  // Four concurrent requests per batch avoids flooding MySQL when many schools exist.
  for (let start = 2; start <= totalPages; start += 4) {
    const end = Math.min(totalPages, start + 3);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, index) =>
        fetchPage(start + index, ALLOCATION_SCHOOL_PAGE_SIZE),
      ),
    );
    if (batch.some(page => !Array.isArray(page.data))) {
      throw new Error('Dữ liệu danh sách trường không hợp lệ.');
    }
    pages.push(...batch);
  }

  // A school may cross a page boundary if another user updates the directory
  // while it is loading. Do not show the same option twice.
  const unique = new Map<number, T>();
  for (const page of pages) {
    for (const school of page.data) unique.set(school.id, school);
  }
  return { data: [...unique.values()], total: first.total };
}
