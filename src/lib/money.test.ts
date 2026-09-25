import assert from "node:assert/strict";
import test from "node:test";
import { dollarsToMinor, minorToDollarInput } from "./money";

test("dollar inputs become minor units", () => {
  assert.equal(dollarsToMinor("400"), 40000);
  assert.equal(dollarsToMinor("86.40"), 8640);
  assert.equal(dollarsToMinor("$1,243.18"), 124318);
  assert.equal(dollarsToMinor("-12.5"), -1250);
  assert.equal(dollarsToMinor("12.345"), null);
  assert.equal(minorToDollarInput(8640), "86.40");
});
