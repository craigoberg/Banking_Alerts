import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("local demo signs in and searches every column", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "banking-alerts-"));
  process.env.LOCAL_STORE_PATH = path.join(dir, "store.json");
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const { localStore } = await import("./store/local");
    const { searchTransactions } = await import("./store/contract");
    const store = localStore();
    assert.equal(await store.verifyLogin("demo", "local-demo"), true);
    assert.equal(await store.verifyLogin("demo", "nope"), false);
    const cards = await store.listCards();
    assert.deepEqual(
      cards
        .filter((card) => card.under)
        .map((card) => card.nickname)
        .sort(),
      ["Bills", "Finley", "MasterCard"],
    );
    const matches = await searchTransactions(store, {
      accountId: null,
      from: "2000-01-01",
      to: "2100-01-01",
      q: "weekly rent",
    });
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.nickname, "House");
    assert.equal(matches[0]?.reference, "HOUSE-RENT");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
