import { randomUUID } from "crypto";
import {
  ALERT_FROM,
  DEFAULT_PULL_WINDOW_DAYS,
  DEFAULT_RECIPIENT,
  DEFAULT_SCHEDULE_HOUR,
  DEFAULT_SCHEDULE_MINUTE,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  FIRST_BANK_NAME,
  SCHEDULE_TIMEZONE,
} from "@/lib/constants";
import { windowFor } from "@/lib/dates";
import { hashPassword } from "@/lib/passwords";
import {
  MOCK_ACCOUNTS,
  MOCK_INSTITUTION,
  transactionsInWindow,
} from "@/lib/redbark/mock-data";
import type {
  AccountRecord,
  AlertState,
  Bank,
  DiscoveredAccount,
  Settings,
} from "@/lib/types";

export type BalanceRow = {
  id: string;
  accountId: string;
  currentAmount: number | null;
  availableAmount: number | null;
  currency: string;
  observedAt: string | null;
  freshness: string | null;
  pulledAt: string;
};

export type TransactionStored = {
  id: string;
  accountId: string;
  redbarkTransactionId: string;
  status: string | null;
  date: string;
  datetime: string | null;
  description: string;
  reference: string | null;
  extendedDescription: string | null;
  amountMinor: number;
  currency: string;
  direction: string | null;
  providerCategory: string | null;
  category: string | null;
  merchantName: string | null;
  merchantCategoryCode: string | null;
  createdAt: string;
};

export type LoginRow = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export type LocalData = {
  banks: Bank[];
  accounts: AccountRecord[];
  balances: BalanceRow[];
  transactions: TransactionStored[];
  alertStates: AlertState[];
  logins: LoginRow[];
  settings: Settings;
  discovered: DiscoveredAccount[];
  pullRuns: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    windowFrom: string | null;
    windowTo: string | null;
    detail: string;
  }[];
  emailLog: {
    id: string;
    sentAt: string;
    fromAddress: string;
    toAddress: string;
    subject: string;
    body: string;
    delivered: boolean;
  }[];
};

const BANK_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_IDS = [
  "22222222-2222-4222-8222-222222222201",
  "22222222-2222-4222-8222-222222222202",
  "22222222-2222-4222-8222-222222222203",
  "22222222-2222-4222-8222-222222222204",
  "22222222-2222-4222-8222-222222222205",
  "22222222-2222-4222-8222-222222222206",
  "22222222-2222-4222-8222-222222222207",
];

export function buildSeed(today: string, now = new Date().toISOString()): LocalData {
  const createdAt = now;
  const bank: Bank = { id: BANK_ID, name: FIRST_BANK_NAME, createdAt };
  const accounts: AccountRecord[] = MOCK_ACCOUNTS.map((spec, index) => ({
    id: ACCOUNT_IDS[index] ?? randomUUID(),
    bankId: BANK_ID,
    bankName: FIRST_BANK_NAME,
    nickname: spec.nickname,
    redbarkAccountId: spec.redbarkAccountId,
    providerName: "fiskil",
    institutionName: MOCK_INSTITUTION.name,
    accountNumberMasked: spec.accountNumberMasked,
    currency: "aud",
    category: "banking",
    accountType: spec.accountType,
    thresholdMinor: spec.thresholdMinor,
    createdAt,
    updatedAt: createdAt,
  }));
  const byNickname = new Map(accounts.map((account) => [account.nickname, account]));
  const window = windowFor(today, DEFAULT_PULL_WINDOW_DAYS);
  const balances: BalanceRow[] = accounts.map((account) => {
    const spec = MOCK_ACCOUNTS.find((item) => item.nickname === account.nickname)!;
    return {
      id: randomUUID(),
      accountId: account.id,
      currentAmount: spec.currentAmount,
      availableAmount: spec.availableAmount,
      currency: "aud",
      observedAt: now,
      freshness: "fresh",
      pulledAt: now,
    };
  });
  const transactions: TransactionStored[] = transactionsInWindow(
    today,
    window.from,
    window.to,
  ).map((spec) => {
    const account = byNickname.get(spec.nickname);
    if (!account) throw new Error(`Missing sample account ${spec.nickname}`);
    return {
      id: randomUUID(),
      accountId: account.id,
      redbarkTransactionId: spec.redbarkTransactionId,
      status: spec.status,
      date: spec.date,
      datetime: null,
      description: spec.description,
      reference: spec.reference,
      extendedDescription: spec.extendedDescription,
      amountMinor: spec.amountMinor,
      currency: "aud",
      direction: spec.direction,
      providerCategory: spec.providerCategory,
      category: spec.category,
      merchantName: spec.merchantName,
      merchantCategoryCode: spec.merchantCategoryCode,
      createdAt: now,
    };
  });
  const discovered: DiscoveredAccount[] = MOCK_ACCOUNTS.map((spec) => ({
    redbarkAccountId: spec.redbarkAccountId,
    bankId: BANK_ID,
    providerName: "fiskil",
    institutionName: MOCK_INSTITUTION.name,
    name: spec.nickname,
    accountNumberMasked: spec.accountNumberMasked,
    currency: "aud",
    category: "banking",
    accountType: spec.accountType,
    status: "open",
    lastSeenAt: now,
  }));
  const settings: Settings = {
    scheduleHour: DEFAULT_SCHEDULE_HOUR,
    scheduleMinute: DEFAULT_SCHEDULE_MINUTE,
    scheduleTimezone: SCHEDULE_TIMEZONE,
    alertRecipient: DEFAULT_RECIPIENT,
    pullWindowDays: DEFAULT_PULL_WINDOW_DAYS,
  };
  return {
    banks: [bank],
    accounts,
    balances,
    transactions,
    alertStates: accounts.map((account) => ({
      accountId: account.id,
      underThreshold: false,
      lastAlertOn: null,
      lastResolvedAt: null,
      updatedAt: now,
    })),
    logins: [
      {
        id: randomUUID(),
        username: DEMO_USERNAME,
        passwordHash: hashPassword(DEMO_PASSWORD),
        createdAt: now,
      },
    ],
    settings,
    discovered,
    pullRuns: [
      {
        id: randomUUID(),
        startedAt: now,
        finishedAt: now,
        status: "success",
        windowFrom: window.from,
        windowTo: window.to,
        detail: `Sample Commonwealth Bank data for the local demo. Alerts would be sent from ${ALERT_FROM}.`,
      },
    ],
    emailLog: [],
  };
}
