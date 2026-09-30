import assert from "node:assert/strict";
import test from "node:test";
import { collectPages } from "./pages";

test("collectPages keeps reading when each response is shorter than the requested page", async () => {
  const stored = Array.from({ length: 14 }, (_, index) => index + 1);
  const seen: number[] = [];
  const rows = await collectPages(async (offset, pageSize) => {
    seen.push(offset);
    const cap = Math.min(3, pageSize);
    return { rows: stored.slice(offset, offset + cap), total: stored.length };
  }, 1000);
  assert.deepEqual(rows, stored);
  assert.deepEqual(seen, [0, 3, 6, 9, 12]);
});

test("collectPages stops at the end of a short final page when the total is unknown", async () => {
  const stored = ["a", "b", "c", "d", "e"];
  const rows = await collectPages(async (offset) => {
    return { rows: stored.slice(offset, offset + 2), total: null };
  }, 2);
  assert.deepEqual(rows, stored);
});

test("collectPages fails instead of returning a partial list", async () => {
  await assert.rejects(
    () =>
      collectPages(async () => {
        return { rows: [], total: 4 };
      }, 2),
    /every transaction/,
  );
});
