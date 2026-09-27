import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { sydneyDate } from "@/lib/dates";
import {
  applyLayout,
  assertUniqueGroupName,
  destinationForDeletedGroup,
  ensureMembership,
  nextSortOrder,
  normalizeGroupName,
  orderedGroups,
} from "@/lib/groups";
import { verifyPassword } from "@/lib/passwords";
import { buildSeed, type LocalData } from "@/lib/seed";
import { cardsFromAccounts, StoreError, type Store } from "@/lib/store/contract";
import type {
  AccountRecord,
  AlertState,
  Bank,
  EmailLog,
  NewBalance,
  NewTransaction,
  PullRun,
  TransactionRow,
} from "@/lib/types";

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function storePath(): string {
  return process.env.LOCAL_STORE_PATH || path.join(process.cwd(), "data", "store.json");
}

async function readData(): Promise<LocalData> {
  const file = storePath();
  try {
    const raw = await readFile(/*turbopackIgnore: true*/ file, "utf8");
    const parsed = JSON.parse(raw) as LocalData;
    const before = JSON.stringify(parsed.groups ?? null) + JSON.stringify(
      parsed.accounts?.map((account) => [account.groupId, account.sortOrder]),
    );
    const data = withGroups(parsed);
    const after = JSON.stringify(data.groups) + JSON.stringify(
      data.accounts.map((account) => [account.groupId, account.sortOrder]),
    );
    if (before !== after) await writeData(data);
    return data;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
    const seeded = buildSeed(sydneyDate());
    await writeData(seeded);
    return seeded;
  }
}

function withGroups(data: LocalData): LocalData {
  if (!Array.isArray(data.groups)) data.groups = [];
  const ensured = ensureMembership(data.groups, data.accounts);
  data.groups = ensured.groups;
  return data;
}

async function writeData(data: LocalData): Promise<void> {
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ file, JSON.stringify(data, null, 2));
}

function toCardBalance(data: LocalData, accountId: string) {
  const rows = data.balances
    .filter((balance) => balance.accountId === accountId)
    .sort((a, b) => b.pulledAt.localeCompare(a.pulledAt));
  return rows[0];
}

function toTransactionRow(data: LocalData, stored: LocalData["transactions"][number]): TransactionRow {
  const account = data.accounts.find((item) => item.id === stored.accountId);
  return {
    id: stored.id,
    accountId: stored.accountId,
    nickname: account?.nickname ?? "Removed account",
    bankName: account?.bankName ?? "",
    date: stored.date,
    description: stored.description,
    reference: stored.reference,
    extendedDescription: stored.extendedDescription,
    merchantName: stored.merchantName,
    category: stored.category,
    providerCategory: stored.providerCategory,
    merchantCategoryCode: stored.merchantCategoryCode,
    amountMinor: stored.amountMinor,
    currency: stored.currency,
    direction: stored.direction,
    status: stored.status,
    redbarkTransactionId: stored.redbarkTransactionId,
  };
}

export function localStore(): Store {
  return {
    async verifyLogin(username, password) {
      const data = await readData();
      const login = data.logins.find((item) => item.username === username);
      if (!login) return false;
      return verifyPassword(password, login.passwordHash);
    },
    async listBanks() {
      const data = await readData();
      return [...data.banks].sort((a, b) => a.name.localeCompare(b.name));
    },
    async createBank(name) {
      return withLock(async () => {
        const data = await readData();
        const bank: Bank = { id: randomUUID(), name, createdAt: new Date().toISOString() };
        data.banks.push(bank);
        await writeData(data);
        return bank;
      });
    },
    async deleteBank(id) {
      await withLock(async () => {
        const data = await readData();
        const accountIds = new Set(data.accounts.filter((account) => account.bankId === id).map((account) => account.id));
        data.banks = data.banks.filter((bank) => bank.id !== id);
        data.accounts = data.accounts.filter((account) => account.bankId !== id);
        data.balances = data.balances.filter((balance) => !accountIds.has(balance.accountId));
        data.transactions = data.transactions.filter((row) => !accountIds.has(row.accountId));
        data.alertStates = data.alertStates.filter((state) => !accountIds.has(state.accountId));
        data.discovered = data.discovered.map((row) =>
          row.bankId === id ? { ...row, bankId: null } : row,
        );
        await writeData(data);
      });
    },
    async listAccounts() {
      const data = await readData();
      return [...data.accounts].sort((a, b) => a.nickname.localeCompare(b.nickname));
    },
    async createAccount({ bankId, nickname }) {
      return withLock(async () => {
        const data = await readData();
        const bank = data.banks.find((item) => item.id === bankId);
        if (!bank) throw new StoreError("That bank is not in the list.");
        const now = new Date().toISOString();
        const group = orderedGroups(data.groups)[0];
        if (!group) throw new StoreError("Add a group before adding an account.");
        const account: AccountRecord = {
          id: randomUUID(),
          bankId,
          bankName: bank.name,
          nickname,
          redbarkAccountId: null,
          providerName: null,
          institutionName: null,
          accountNumberMasked: null,
          currency: "aud",
          category: null,
          accountType: null,
          thresholdMinor: 0,
          groupId: group.id,
          sortOrder: nextSortOrder(data.accounts, group.id),
          createdAt: now,
          updatedAt: now,
        };
        data.accounts.push(account);
        data.alertStates.push({
          accountId: account.id,
          underThreshold: false,
          lastAlertOn: null,
          lastResolvedAt: null,
          updatedAt: now,
        });
        await writeData(data);
        return account;
      });
    },
    async updateAccount(id, input) {
      await withLock(async () => {
        const data = await readData();
        const account = data.accounts.find((item) => item.id === id);
        if (!account) throw new StoreError("That account is not in the list.", 404);
        if (input.redbarkAccountId) {
          const taken = data.accounts.find(
            (item) => item.id !== id && item.redbarkAccountId === input.redbarkAccountId,
          );
          if (taken) {
            throw new StoreError(
              `That RedBark account is already linked to ${taken.nickname}.`,
            );
          }
        }
        if (input.nickname !== undefined) account.nickname = input.nickname;
        if (input.thresholdMinor !== undefined) account.thresholdMinor = input.thresholdMinor;
        if (input.redbarkAccountId !== undefined) {
          account.redbarkAccountId = input.redbarkAccountId;
          const discovered = data.discovered.find(
            (row) => row.redbarkAccountId === input.redbarkAccountId,
          );
          if (discovered) {
            account.providerName = discovered.providerName;
            account.institutionName = discovered.institutionName;
            account.accountNumberMasked = discovered.accountNumberMasked;
            account.currency = discovered.currency || account.currency;
            account.category = discovered.category;
            account.accountType = discovered.accountType;
          }
          if (input.redbarkAccountId === null) {
            account.providerName = null;
            account.institutionName = null;
            account.accountNumberMasked = null;
            account.category = null;
            account.accountType = null;
          }
        }
        account.updatedAt = new Date().toISOString();
        await writeData(data);
      });
    },
    async deleteAccount(id) {
      await withLock(async () => {
        const data = await readData();
        data.accounts = data.accounts.filter((account) => account.id !== id);
        data.balances = data.balances.filter((balance) => balance.accountId !== id);
        data.transactions = data.transactions.filter((row) => row.accountId !== id);
        data.alertStates = data.alertStates.filter((state) => state.accountId !== id);
        await writeData(data);
      });
    },
    async listDiscovered() {
      const data = await readData();
      return [...data.discovered].sort((a, b) => a.name.localeCompare(b.name));
    },
    async upsertDiscovered(rows) {
      await withLock(async () => {
        const data = await readData();
        for (const row of rows) {
          const index = data.discovered.findIndex(
            (item) => item.redbarkAccountId === row.redbarkAccountId,
          );
          if (index === -1) data.discovered.push(row);
          else data.discovered[index] = row;
        }
        await writeData(data);
      });
    },
    async getSettings() {
      const data = await readData();
      return data.settings;
    },
    async updateSettings(input) {
      return withLock(async () => {
        const data = await readData();
        data.settings = { ...data.settings, ...input };
        await writeData(data);
        return data.settings;
      });
    },
    async listCards() {
      const data = await readData();
      const balances = new Map(
        data.accounts.map((account) => {
          const latest = toCardBalance(data, account.id);
          return [
            account.id,
            {
              currentAmount: latest?.currentAmount ?? null,
              availableAmount: latest?.availableAmount ?? null,
              freshness: latest?.freshness ?? null,
              observedAt: latest?.observedAt ?? null,
            },
          ] as const;
        }),
      );
      return cardsFromAccounts(data.accounts, balances).sort(
        (a, b) => a.sortOrder - b.sortOrder || a.nickname.localeCompare(b.nickname),
      );
    },
    async listTransactions(filter) {
      const data = await readData();
      return data.transactions
        .filter((row) => row.date >= filter.from && row.date <= filter.to)
        .filter((row) => !filter.accountId || row.accountId === filter.accountId)
        .map((row) => toTransactionRow(data, row))
        .sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description));
    },
    async insertBalances(rows: NewBalance[]) {
      await withLock(async () => {
        const data = await readData();
        const now = new Date().toISOString();
        for (const row of rows) {
          data.balances.push({
            id: randomUUID(),
            accountId: row.accountId,
            currentAmount: row.currentAmount,
            availableAmount: row.availableAmount,
            currency: row.currency,
            observedAt: row.observedAt,
            freshness: row.freshness,
            pulledAt: now,
          });
        }
        const kept = new Map<string, LocalData["balances"]>();
        for (const balance of data.balances) {
          const list = kept.get(balance.accountId) ?? [];
          list.push(balance);
          kept.set(balance.accountId, list);
        }
        data.balances = [...kept.values()].flatMap((list) =>
          list.sort((a, b) => b.pulledAt.localeCompare(a.pulledAt)).slice(0, 30),
        );
        await writeData(data);
      });
    },
    async upsertTransactions(rows: NewTransaction[]) {
      return withLock(async () => {
        const data = await readData();
        for (const row of rows) {
          const existing = data.transactions.find(
            (item) => item.redbarkTransactionId === row.redbarkTransactionId,
          );
          if (existing) {
            Object.assign(existing, {
              accountId: row.accountId,
              status: row.status,
              date: row.date,
              datetime: row.datetime,
              description: row.description,
              reference: row.reference,
              extendedDescription: row.extendedDescription,
              amountMinor: row.amountMinor,
              currency: row.currency,
              direction: row.direction,
              providerCategory: row.providerCategory,
              category: row.category,
              merchantName: row.merchantName,
              merchantCategoryCode: row.merchantCategoryCode,
            });
          } else {
            data.transactions.push({
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              ...row,
            });
          }
        }
        await writeData(data);
        return rows.length;
      });
    },
    async listAlertStates() {
      const data = await readData();
      return data.alertStates;
    },
    async saveAlertState(state: AlertState) {
      await withLock(async () => {
        const data = await readData();
        const index = data.alertStates.findIndex((item) => item.accountId === state.accountId);
        if (index === -1) data.alertStates.push(state);
        else data.alertStates[index] = state;
        await writeData(data);
      });
    },
    async logEmail(entry: Omit<EmailLog, "id">) {
      await withLock(async () => {
        const data = await readData();
        data.emailLog.unshift({ id: randomUUID(), ...entry });
        data.emailLog = data.emailLog.slice(0, 50);
        await writeData(data);
      });
    },
    async listEmails(limit: number) {
      const data = await readData();
      return data.emailLog.slice(0, limit);
    },
    async startPull(input): Promise<PullRun> {
      return withLock(async () => {
        const data = await readData();
        const run: PullRun = {
          id: randomUUID(),
          startedAt: new Date().toISOString(),
          finishedAt: null,
          status: "running",
          windowFrom: input.windowFrom,
          windowTo: input.windowTo,
          detail: "",
        };
        data.pullRuns.unshift(run);
        data.pullRuns = data.pullRuns.slice(0, 20);
        await writeData(data);
        return run;
      });
    },
    async finishPull(id, status, detail) {
      await withLock(async () => {
        const data = await readData();
        const run = data.pullRuns.find((item) => item.id === id);
        if (!run) return;
        run.status = status;
        run.detail = detail;
        run.finishedAt = new Date().toISOString();
        await writeData(data);
      });
    },
    async latestPull() {
      const data = await readData();
      return data.pullRuns[0] ?? null;
    },
    async listGroups() {
      const data = await readData();
      return orderedGroups(data.groups);
    },
    async createGroup(name) {
      return withLock(async () => {
        const data = await readData();
        const trimmed = normalizeGroupName(name);
        assertUniqueGroupName(data.groups, trimmed);
        const group = {
          id: randomUUID(),
          name: trimmed,
          sortOrder: data.groups.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
          collapsed: false,
        };
        data.groups.push(group);
        await writeData(data);
        return group;
      });
    },
    async updateGroup(id, input) {
      return withLock(async () => {
        const data = await readData();
        const group = data.groups.find((item) => item.id === id);
        if (!group) throw new StoreError("That group is not in the list.", 404);
        if (input.name !== undefined) {
          const trimmed = normalizeGroupName(input.name);
          assertUniqueGroupName(data.groups, trimmed, id);
          group.name = trimmed;
        }
        if (input.collapsed !== undefined) group.collapsed = input.collapsed;
        if (input.name === undefined && input.collapsed === undefined) {
          throw new StoreError("Nothing to change.");
        }
        await writeData(data);
        return group;
      });
    },
    async deleteGroup(id) {
      await withLock(async () => {
        const data = await readData();
        const destination = destinationForDeletedGroup(data.groups, id);
        let order = nextSortOrder(data.accounts, destination.id);
        for (const account of data.accounts) {
          if (account.groupId !== id) continue;
          account.groupId = destination.id;
          account.sortOrder = order;
          order += 1;
        }
        data.groups = data.groups.filter((group) => group.id !== id);
        await writeData(data);
      });
    },
    async saveGroupLayout(layout) {
      await withLock(async () => {
        const data = await readData();
        applyLayout(data.groups, data.accounts, layout);
        await writeData(data);
      });
    },
  };
}
