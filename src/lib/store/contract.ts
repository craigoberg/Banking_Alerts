import { isUnderThreshold } from "@/lib/alerts";
import { filterTransactions } from "@/lib/search";
import type {
  AccountCard,
  AccountRecord,
  AlertState,
  Bank,
  DiscoveredAccount,
  EmailLog,
  NewBalance,
  NewTransaction,
  PullRun,
  Settings,
  TransactionRow,
} from "@/lib/types";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export type TransactionFilter = {
  accountId: string | null;
  from: string;
  to: string;
  q: string;
};

export type Store = {
  verifyLogin(username: string, password: string): Promise<boolean>;
  listBanks(): Promise<Bank[]>;
  createBank(name: string): Promise<Bank>;
  deleteBank(id: string): Promise<void>;
  listAccounts(): Promise<AccountRecord[]>;
  createAccount(input: { bankId: string; nickname: string }): Promise<AccountRecord>;
  updateAccount(
    id: string,
    input: { nickname?: string; thresholdMinor?: number; redbarkAccountId?: string | null },
  ): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  listDiscovered(): Promise<DiscoveredAccount[]>;
  upsertDiscovered(rows: DiscoveredAccount[]): Promise<void>;
  getSettings(): Promise<Settings>;
  updateSettings(
    input: Partial<
      Pick<Settings, "scheduleHour" | "scheduleMinute" | "alertRecipient" | "pullWindowDays">
    >,
  ): Promise<Settings>;
  listCards(): Promise<AccountCard[]>;
  listTransactions(filter: Omit<TransactionFilter, "q">): Promise<TransactionRow[]>;
  insertBalances(rows: NewBalance[]): Promise<void>;
  upsertTransactions(rows: NewTransaction[]): Promise<number>;
  listAlertStates(): Promise<AlertState[]>;
  saveAlertState(state: AlertState): Promise<void>;
  logEmail(entry: Omit<EmailLog, "id">): Promise<void>;
  listEmails(limit: number): Promise<EmailLog[]>;
  startPull(input: { windowFrom: string; windowTo: string }): Promise<PullRun>;
  finishPull(id: string, status: string, detail: string): Promise<void>;
  latestPull(): Promise<PullRun | null>;
};

export function cardsFromAccounts(
  accounts: AccountRecord[],
  balances: Map<
    string,
    {
      currentAmount: number | null;
      availableAmount: number | null;
      freshness: string | null;
      observedAt: string | null;
    }
  >,
): AccountCard[] {
  return accounts.map((account) => {
    const balance = balances.get(account.id);
    const currentAmount = balance?.currentAmount ?? null;
    return {
      id: account.id,
      nickname: account.nickname,
      bankName: account.bankName,
      currency: account.currency,
      currentAmount,
      availableAmount: balance?.availableAmount ?? null,
      freshness: balance?.freshness ?? null,
      observedAt: balance?.observedAt ?? null,
      thresholdMinor: account.thresholdMinor,
      under: isUnderThreshold(currentAmount, account.thresholdMinor),
      accountNumberMasked: account.accountNumberMasked,
      category: account.category,
      redbarkAccountId: account.redbarkAccountId,
    };
  });
}

export async function searchTransactions(
  store: Store,
  filter: TransactionFilter,
): Promise<TransactionRow[]> {
  const rows = await store.listTransactions({
    accountId: filter.accountId,
    from: filter.from,
    to: filter.to,
  });
  return filterTransactions(rows, filter.q);
}
