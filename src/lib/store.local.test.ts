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

    const groups = await store.listGroups();
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.name, "Accounts");
    assert.equal(groups[0]?.collapsed, false);
    assert.equal(cards.every((card) => card.groupId === groups[0]?.id), true);
    const created = await store.createGroup("Spending");
    const bills = cards.find((card) => card.nickname === "Bills");
    assert.ok(bills);
    await store.saveGroupLayout([
      { id: groups[0]!.id, accountIds: cards.filter((card) => card.id !== bills.id).map((card) => card.id) },
      { id: created.id, accountIds: [bills.id] },
    ]);
    await store.updateGroup(created.id, { collapsed: true, name: "Spending" });
    const moved = (await store.listCards()).find((card) => card.nickname === "Bills");
    assert.equal(moved?.groupId, created.id);
    assert.equal(moved?.sortOrder, 0);
    const saved = await store.listGroups();
    assert.equal(saved.find((group) => group.id === created.id)?.collapsed, true);
    await store.deleteGroup(created.id);
    const restored = (await store.listCards()).find((card) => card.nickname === "Bills");
    assert.equal(restored?.groupId, groups[0]?.id);
    assert.equal((await store.listGroups()).some((group) => group.name === "Spending"), false);
    await assert.rejects(() => store.deleteGroup(groups[0]!.id), /Keep at least one group/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
