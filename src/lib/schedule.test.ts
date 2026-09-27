import assert from "node:assert/strict";
import test from "node:test";
import { windowFor } from "./dates";
import { transactionsInWindow } from "./redbark/mock-data";
import { cronExpressionsForSydneyHour, shouldRunScheduledPull } from "./schedule";

test("midnight Sydney is covered across standard time and daylight saving", () => {
  assert.equal(shouldRunScheduledPull(new Date("2026-09-24T14:00:00.000Z"), 0, 0), true);
  assert.equal(shouldRunScheduledPull(new Date("2026-09-24T13:00:00.000Z"), 0, 0), false);
  assert.equal(shouldRunScheduledPull(new Date("2026-01-14T13:00:00.000Z"), 0, 0), true);
  assert.equal(shouldRunScheduledPull(new Date("2026-01-14T14:00:00.000Z"), 0, 0), false);
  assert.deepEqual(cronExpressionsForSydneyHour(0, 0), ["0 13 * * *", "0 14 * * *"]);
  assert.deepEqual(cronExpressionsForSydneyHour(5, 0), ["0 18 * * *", "0 19 * * *"]);
  assert.equal(shouldRunScheduledPull(new Date("2026-09-24T19:00:00.000Z"), 5, 0), true);
  assert.equal(shouldRunScheduledPull(new Date("2026-01-14T18:00:00.000Z"), 5, 0), true);
});

test("a one-month window keeps the ferry out and a two-year window brings the backfill in", () => {
  const today = "2026-09-25";
  const month = windowFor(today, 31);
  const monthRows = transactionsInWindow(today, month.from, month.to).map((row) => row.redbarkTransactionId);
  assert.equal(monthRows.includes("txn_fk_demo_woolworths"), true);
  assert.equal(monthRows.includes("txn_fk_demo_ferry"), false);
  assert.equal(monthRows.includes("txn_fk_demo_backfill"), false);
  const backfill = windowFor(today, 731);
  const backfillRows = transactionsInWindow(today, backfill.from, backfill.to).map(
    (row) => row.redbarkTransactionId,
  );
  assert.equal(backfillRows.includes("txn_fk_demo_ferry"), true);
  assert.equal(backfillRows.includes("txn_fk_demo_backfill"), true);
});
