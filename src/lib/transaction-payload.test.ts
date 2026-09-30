import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { unpackTransactions } from "./transaction-payload";

test("unpackTransactions reads a gzip payload and leaves plain rows alone", async () => {
  const rows = [
    { id: "1", description: "Shire Soft" },
    { id: "2", description: "Other" },
  ];
  const packed = gzipSync(Buffer.from(JSON.stringify(rows))).toString("base64");
  assert.deepEqual(await unpackTransactions({ transactions: [], transactionsGzip: packed }), rows);
  assert.deepEqual(await unpackTransactions({ transactions: rows }), rows);
});
