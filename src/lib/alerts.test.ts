import assert from "node:assert/strict";
import test from "node:test";
import { decideAlert, isUnderThreshold } from "./alerts";

test("balance under the threshold is an alarm", () => {
  assert.equal(isUnderThreshold(8640, 40000), true);
  assert.equal(isUnderThreshold(40000, 40000), false);
  assert.equal(isUnderThreshold(null, 40000), null);
});

test("one under email per Sydney day, then one resolved email", () => {
  assert.deepEqual(
    decideAlert({ under: true, previouslyUnder: false, lastAlertOn: null, today: "2026-09-25" }),
    { kind: "under", send: true },
  );
  assert.deepEqual(
    decideAlert({
      under: true,
      previouslyUnder: true,
      lastAlertOn: "2026-09-25",
      today: "2026-09-25",
    }),
    { kind: "under", send: false },
  );
  assert.deepEqual(
    decideAlert({
      under: true,
      previouslyUnder: true,
      lastAlertOn: "2026-09-24",
      today: "2026-09-25",
    }),
    { kind: "under", send: true },
  );
  assert.deepEqual(
    decideAlert({ under: false, previouslyUnder: true, lastAlertOn: "2026-09-25", today: "2026-09-26" }),
    { kind: "resolved", send: true },
  );
  assert.deepEqual(
    decideAlert({ under: false, previouslyUnder: false, lastAlertOn: null, today: "2026-09-25" }),
    { kind: "none", send: false },
  );
  assert.deepEqual(
    decideAlert({ under: null, previouslyUnder: false, lastAlertOn: null, today: "2026-09-25" }),
    { kind: "none", send: false },
  );
});
