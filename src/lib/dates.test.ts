import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  currentMonthWindow,
  describeMonthScroller,
  earliestSelectableDate,
  maxPullWindowDays,
  monthWindow,
  stepMonth,
  windowFor,
} from "./dates";

const today = "2026-09-27";

test("current month is month to date and the next month is blocked", () => {
  const current = monthWindow(2026, 9, today);
  assert.equal(current.from, "2026-09-01");
  assert.equal(current.to, "2026-09-27");
  assert.equal(current.label, "Sep 2026 · month to date");
  const described = describeMonthScroller(current.from, current.to, today);
  assert.equal(described.label, "Sep 2026 · month to date");
  assert.equal(described.canGoNext, false);
  assert.equal(stepMonth(current.from, today, 1), null);
});

test("an earlier month is the full calendar month", () => {
  const august = stepMonth("2026-09-01", today, -1);
  assert.ok(august);
  assert.equal(august.from, "2026-08-01");
  assert.equal(august.to, "2026-08-31");
  assert.equal(august.label, "Aug 2026");
  assert.equal(describeMonthScroller(august.from, august.to, today).canGoNext, true);
  const back = stepMonth(august.from, today, 1);
  assert.equal(back?.to, "2026-09-27");
  assert.equal(back?.label, "Sep 2026 · month to date");
});

test("february uses the real last day, including leap years", () => {
  assert.equal(monthWindow(2026, 2, today).to, "2026-02-28");
  assert.equal(monthWindow(2024, 2, today).to, "2024-02-29");
});

test("manual dates stay custom and still cannot step into the future", () => {
  const described = describeMonthScroller("2026-09-03", "2026-09-10", today);
  assert.equal(described.label, "Custom dates");
  assert.equal(described.canGoNext, false);
  assert.equal(stepMonth("2027-01-01", today, 1), null);
  assert.equal(stepMonth("2027-01-01", today, -1), null);
});

test("opening the current month is the first through today", () => {
  const current = currentMonthWindow(today);
  assert.equal(current.from, "2026-09-01");
  assert.equal(current.to, today);
  assert.equal(current.isCurrent, true);
});

test("lookback stops at seven calendar years, including a leap day", () => {
  assert.equal(earliestSelectableDate(today), "2019-09-27");
  assert.equal(earliestSelectableDate("2024-02-29"), "2017-02-28");
  const maxDays = maxPullWindowDays(today);
  assert.equal(windowFor(today, maxDays).from, "2019-09-27");
  assert.equal(windowFor(today, maxDays + 400).from, "2019-09-27");
  assert.equal(windowFor(today, 31).from, addDays(today, -30));
  assert.equal(stepMonth("2019-11-01", today, -1)?.from, "2019-10-01");
  assert.equal(stepMonth("2019-10-01", today, -1), null);
  assert.equal(describeMonthScroller("2019-10-01", "2019-10-31", today).canGoPrevious, false);
});
