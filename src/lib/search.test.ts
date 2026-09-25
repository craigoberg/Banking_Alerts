import assert from "node:assert/strict";
import test from "node:test";
import { filterTransactions } from "./search";
import type { TransactionRow } from "./types";

const rows: TransactionRow[] = [
  {
    id: "1",
    accountId: "house",
    nickname: "House",
    bankName: "Commonwealth Bank",
    date: "2026-09-24",
    description: "WOOLWORTHS 1234 SYDNEY",
    reference: null,
    extendedDescription: null,
    merchantName: "Woolworths",
    category: "Groceries",
    providerCategory: "groceries",
    merchantCategoryCode: "5411",
    amountMinor: -8640,
    currency: "aud",
    direction: "debit",
    status: "posted",
    redbarkTransactionId: "txn_fk_demo_woolworths",
  },
  {
    id: "2",
    accountId: "bills",
    nickname: "Bills",
    bankName: "Commonwealth Bank",
    date: "2026-09-23",
    description: "AGL ENERGY BILL",
    reference: "INV-44921",
    extendedDescription: "Electricity account",
    merchantName: "AGL",
    category: "Utilities",
    providerCategory: "utilities",
    merchantCategoryCode: null,
    amountMinor: -14230,
    currency: "aud",
    direction: "debit",
    status: "posted",
    redbarkTransactionId: "txn_fk_demo_agl",
  },
  {
    id: "3",
    accountId: "house",
    nickname: "House",
    bankName: "Commonwealth Bank",
    date: "2026-09-13",
    description: "RENT TRANSFER",
    reference: "HOUSE-RENT",
    extendedDescription: "Weekly rent to landlord",
    merchantName: null,
    category: "Housing",
    providerCategory: "rent",
    merchantCategoryCode: null,
    amountMinor: -65000,
    currency: "aud",
    direction: "debit",
    status: "posted",
    redbarkTransactionId: "txn_fk_demo_rent",
  },
  {
    id: "4",
    accountId: "card",
    nickname: "MasterCard",
    bankName: "Commonwealth Bank",
    date: "2026-09-20",
    description: "QANTAS AIRWAYS",
    reference: null,
    extendedDescription: "Flight SYD to MEL",
    merchantName: "Qantas",
    category: "Travel",
    providerCategory: "airlines",
    merchantCategoryCode: "4511",
    amountMinor: -32000,
    currency: "aud",
    direction: "debit",
    status: "posted",
    redbarkTransactionId: "txn_fk_demo_qantas",
  },
];

test("search matches description, reference, extended text, merchant code, account, and amount", () => {
  assert.deepEqual(
    filterTransactions(rows, "woolworths").map((row) => row.id),
    ["1"],
  );
  assert.deepEqual(
    filterTransactions(rows, "INV-44921").map((row) => row.id),
    ["2"],
  );
  assert.deepEqual(
    filterTransactions(rows, "weekly rent").map((row) => row.id),
    ["3"],
  );
  assert.deepEqual(
    filterTransactions(rows, "4511").map((row) => row.id),
    ["4"],
  );
  assert.deepEqual(
    filterTransactions(rows, "House").map((row) => row.id),
    ["1", "3"],
  );
  assert.equal(filterTransactions(rows, "86.40").length, 1);
  assert.equal(filterTransactions(rows, "commonwealth").length, 4);
  assert.equal(filterTransactions(rows, "no-such-thing").length, 0);
});
