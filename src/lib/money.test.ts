import assert from "node:assert/strict";
import test from "node:test";
import { dollarsToMinor, minorToDollarInput, sumAmountTotals } from "./money";

test("dollar inputs become minor units", () => {
  assert.equal(dollarsToMinor("400"), 40000);
  assert.equal(dollarsToMinor("86.40"), 8640);
  assert.equal(dollarsToMinor("$1,243.18"), 124318);
  assert.equal(dollarsToMinor("-12.5"), -1250);
  assert.equal(dollarsToMinor("12.345"), null);
  assert.equal(minorToDollarInput(8640), "86.40");
});

test("totals follow the table sign: positive is income, negative is expense", () => {
  const totals = sumAmountTotals([
    { amountMinor: 15000, currency: "AUD" },
    { amountMinor: -8640, currency: "aud" },
    { amountMinor: -100, currency: "aud" },
    { amountMinor: 0, currency: "aud" },
    { amountMinor: 500, currency: "usd" },
  ]);
  assert.deepEqual(totals, [
    { currency: "aud", incomeMinor: 15000, expenseMinor: -8740 },
    { currency: "usd", incomeMinor: 500, expenseMinor: 0 },
  ]);
  assert.deepEqual(sumAmountTotals([]), []);
});
