import { StoreError } from "@/lib/store/contract";

export type PageResult<T> = {
  rows: T[];
  total: number | null;
};

const MAX_PAGES = 500;

function knownTotal(total: number | null): number | null {
  return total != null && Number.isFinite(total) ? total : null;
}

export async function collectPages<T>(
  fetchPage: (offset: number, pageSize: number) => Promise<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new StoreError("Could not list every transaction in that date range.", 500);
  }
  const first = await fetchPage(0, pageSize);
  const total = knownTotal(first.total);
  if (total != null) {
    if (first.rows.length >= total) return first.rows.slice(0, total);
    if (first.rows.length === 0) {
      throw new StoreError("Could not list every transaction in that date range.", 500);
    }
    const step = first.rows.length;
    const offsets: number[] = [];
    for (let offset = step; offset < total; offset += step) offsets.push(offset);
    if (offsets.length > MAX_PAGES) {
      throw new StoreError("Could not list every transaction in that date range.", 500);
    }
    const rest = await Promise.all(offsets.map((offset) => fetchPage(offset, pageSize)));
    const rows = [first.rows, ...rest.map((page) => page.rows)].flat();
    if (rows.length < total) {
      throw new StoreError("Could not list every transaction in that date range.", 500);
    }
    return rows;
  }

  const rows = [...first.rows];
  if (first.rows.length < pageSize) return rows;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(rows.length, pageSize);
    if (result.rows.length === 0) break;
    rows.push(...result.rows);
    if (result.rows.length < pageSize) break;
  }
  if (rows.length >= MAX_PAGES * pageSize) {
    throw new StoreError("Could not list every transaction in that date range.", 500);
  }
  return rows;
}
