export type Bank = {
  id: string;
  name: string;
  createdAt: string;
};

export type AccountRecord = {
  id: string;
  bankId: string;
  bankName: string;
  nickname: string;
  redbarkAccountId: string | null;
  providerName: string | null;
  institutionName: string | null;
  accountNumberMasked: string | null;
  currency: string;
  category: string | null;
  accountType: string | null;
  thresholdMinor: number;
  groupId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AccountGroup = {
  id: string;
  name: string;
  sortOrder: number;
  collapsed: boolean;
};

export type DiscoveredAccount = {
  redbarkAccountId: string;
  bankId: string | null;
  providerName: string | null;
  institutionName: string | null;
  name: string;
  accountNumberMasked: string | null;
  currency: string;
  category: string | null;
  accountType: string | null;
  status: string | null;
  lastSeenAt: string;
};

export type Settings = {
  scheduleHour: number;
  scheduleMinute: number;
  scheduleTimezone: string;
  alertRecipient: string;
  pullWindowDays: number;
};

export type AccountCard = {
  id: string;
  nickname: string;
  bankName: string;
  currency: string;
  currentAmount: number | null;
  availableAmount: number | null;
  freshness: string | null;
  observedAt: string | null;
  thresholdMinor: number;
  under: boolean | null;
  accountNumberMasked: string | null;
  category: string | null;
  redbarkAccountId: string | null;
  groupId: string;
  sortOrder: number;
};

export type TransactionRow = {
  id: string;
  accountId: string;
  nickname: string;
  bankName: string;
  date: string;
  description: string;
  reference: string | null;
  extendedDescription: string | null;
  merchantName: string | null;
  category: string | null;
  providerCategory: string | null;
  merchantCategoryCode: string | null;
  amountMinor: number;
  currency: string;
  direction: string | null;
  status: string | null;
  redbarkTransactionId: string;
};

export type AlertState = {
  accountId: string;
  underThreshold: boolean;
  lastAlertOn: string | null;
  lastResolvedAt: string | null;
  updatedAt: string;
};

export type EmailLog = {
  id: string;
  sentAt: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  body: string;
  delivered: boolean;
};

export type PullRun = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  windowFrom: string | null;
  windowTo: string | null;
  detail: string;
};

export type NewBalance = {
  accountId: string;
  currentAmount: number | null;
  availableAmount: number | null;
  currency: string;
  observedAt: string | null;
  freshness: string | null;
};

export type NewTransaction = {
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
};
