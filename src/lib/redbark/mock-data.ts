import { addDays } from "@/lib/dates";
import { FIRST_BANK_NAME } from "@/lib/constants";

export type MockAccountSpec = {
  nickname: string;
  redbarkAccountId: string;
  accountNumberMasked: string;
  accountType: string;
  currentAmount: number;
  availableAmount: number;
  thresholdMinor: number;
};

export const MOCK_ACCOUNTS: MockAccountSpec[] = [
  {
    nickname: "House",
    redbarkAccountId: "acct_DemoHouse1",
    accountNumberMasked: "4821",
    accountType: "savings",
    currentAmount: 1_243_018,
    availableAmount: 1_243_018,
    thresholdMinor: 300_000,
  },
  {
    nickname: "Bills",
    redbarkAccountId: "acct_DemoBills1",
    accountNumberMasked: "1933",
    accountType: "transaction",
    currentAmount: 8_640,
    availableAmount: 8_640,
    thresholdMinor: 40_000,
  },
  {
    nickname: "MasterCard",
    redbarkAccountId: "acct_DemoMcard1",
    accountNumberMasked: "7740",
    accountType: "credit_card",
    currentAmount: 21_000,
    availableAmount: 479_000,
    thresholdMinor: 100_000,
  },
  {
    nickname: "Shares",
    redbarkAccountId: "acct_DemoShare1",
    accountNumberMasked: "2208",
    accountType: "transaction",
    currentAmount: 1_890_000,
    availableAmount: 1_890_000,
    thresholdMinor: 500_000,
  },
  {
    nickname: "Finley",
    redbarkAccountId: "acct_DemoFinley",
    accountNumberMasked: "6614",
    accountType: "savings",
    currentAmount: 4_215,
    availableAmount: 4_215,
    thresholdMinor: 10_000,
  },
  {
    nickname: "Killian",
    redbarkAccountId: "acct_DemoKillia",
    accountNumberMasked: "9052",
    accountType: "savings",
    currentAmount: 64_000,
    availableAmount: 64_000,
    thresholdMinor: 20_000,
  },
  {
    nickname: "Alfred",
    redbarkAccountId: "acct_DemoAlfred",
    accountNumberMasked: "1187",
    accountType: "savings",
    currentAmount: 150_533,
    availableAmount: 150_533,
    thresholdMinor: 50_000,
  },
];

export type MockTransactionSpec = {
  redbarkTransactionId: string;
  nickname: string;
  dayOffset: number;
  description: string;
  reference: string | null;
  extendedDescription: string | null;
  amountMinor: number;
  direction: "debit" | "credit";
  status: string;
  merchantName: string | null;
  merchantCategoryCode: string | null;
  category: string | null;
  providerCategory: string | null;
};

export const MOCK_TRANSACTIONS: MockTransactionSpec[] = [
  {
    redbarkTransactionId: "txn_fk_demo_woolworths",
    nickname: "House",
    dayOffset: -1,
    description: "WOOLWORTHS 1234 SYDNEY",
    reference: null,
    extendedDescription: null,
    amountMinor: -8640,
    direction: "debit",
    status: "posted",
    merchantName: "Woolworths",
    merchantCategoryCode: "5411",
    category: "Groceries",
    providerCategory: "groceries",
  },
  {
    redbarkTransactionId: "txn_fk_demo_agl",
    nickname: "Bills",
    dayOffset: -2,
    description: "AGL ENERGY BILL",
    reference: "INV-44921",
    extendedDescription: "Electricity account",
    amountMinor: -14230,
    direction: "debit",
    status: "posted",
    merchantName: "AGL",
    merchantCategoryCode: null,
    category: "Utilities",
    providerCategory: "utilities",
  },
  {
    redbarkTransactionId: "txn_fk_demo_coles",
    nickname: "House",
    dayOffset: -3,
    description: "COLES EXPRESS",
    reference: null,
    extendedDescription: null,
    amountMinor: -5430,
    direction: "debit",
    status: "posted",
    merchantName: "Coles",
    merchantCategoryCode: "5411",
    category: "Groceries",
    providerCategory: "groceries",
  },
  {
    redbarkTransactionId: "txn_fk_demo_pocket",
    nickname: "Finley",
    dayOffset: -4,
    description: "POCKET MONEY",
    reference: "FAM-FINLEY",
    extendedDescription: null,
    amountMinor: 2000,
    direction: "credit",
    status: "pending",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Transfer",
    providerCategory: null,
  },
  {
    redbarkTransactionId: "txn_fk_demo_qantas",
    nickname: "MasterCard",
    dayOffset: -5,
    description: "QANTAS AIRWAYS",
    reference: null,
    extendedDescription: "Flight SYD to MEL",
    amountMinor: -32000,
    direction: "debit",
    status: "posted",
    merchantName: "Qantas",
    merchantCategoryCode: "4511",
    category: "Travel",
    providerCategory: "airlines",
  },
  {
    redbarkTransactionId: "txn_fk_demo_netflix",
    nickname: "MasterCard",
    dayOffset: -7,
    description: "NETFLIX.COM",
    reference: null,
    extendedDescription: null,
    amountMinor: -2299,
    direction: "debit",
    status: "posted",
    merchantName: "Netflix",
    merchantCategoryCode: "4899",
    category: "Entertainment",
    providerCategory: "streaming",
  },
  {
    redbarkTransactionId: "txn_fk_demo_alfred",
    nickname: "Alfred",
    dayOffset: -8,
    description: "TRANSFER FROM HOUSE",
    reference: "FAM-ALFRED",
    extendedDescription: null,
    amountMinor: 15000,
    direction: "credit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Transfer",
    providerCategory: null,
  },
  {
    redbarkTransactionId: "txn_fk_demo_vas",
    nickname: "Shares",
    dayOffset: -9,
    description: "DIVIDEND VAS",
    reference: "VAS-DRP",
    extendedDescription: "Vanguard Australian Shares",
    amountMinor: 18650,
    direction: "credit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Dividends",
    providerCategory: "investment",
  },
  {
    redbarkTransactionId: "txn_fk_demo_rent",
    nickname: "House",
    dayOffset: -12,
    description: "RENT TRANSFER",
    reference: "HOUSE-RENT",
    extendedDescription: "Weekly rent to landlord",
    amountMinor: -65000,
    direction: "debit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Housing",
    providerCategory: "rent",
  },
  {
    redbarkTransactionId: "txn_fk_demo_salary",
    nickname: "House",
    dayOffset: -14,
    description: "SALARY CREDIT",
    reference: "PAY-WEEKLY",
    extendedDescription: null,
    amountMinor: 425000,
    direction: "credit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Income",
    providerCategory: "salary",
  },
  {
    redbarkTransactionId: "txn_fk_demo_chemist",
    nickname: "Alfred",
    dayOffset: -15,
    description: "CHEMIST WAREHOUSE",
    reference: null,
    extendedDescription: null,
    amountMinor: -2495,
    direction: "debit",
    status: "posted",
    merchantName: "Chemist Warehouse",
    merchantCategoryCode: "5912",
    category: "Health",
    providerCategory: "pharmacy",
  },
  {
    redbarkTransactionId: "txn_fk_demo_woolworths_2",
    nickname: "House",
    dayOffset: -16,
    description: "WOOLWORTHS 8821 BONDI",
    reference: null,
    extendedDescription: null,
    amountMinor: -6120,
    direction: "debit",
    status: "posted",
    merchantName: "Woolworths",
    merchantCategoryCode: "5411",
    category: "Groceries",
    providerCategory: "groceries",
  },
  {
    redbarkTransactionId: "txn_fk_demo_school",
    nickname: "Killian",
    dayOffset: -18,
    description: "SCHOOL FEES",
    reference: "SCH-KILLIAN",
    extendedDescription: null,
    amountMinor: -42000,
    direction: "debit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Education",
    providerCategory: "education",
  },
  {
    redbarkTransactionId: "txn_fk_demo_interest",
    nickname: "Shares",
    dayOffset: -20,
    description: "INTEREST PAID",
    reference: null,
    extendedDescription: null,
    amountMinor: 312,
    direction: "credit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Interest",
    providerCategory: "interest",
  },
  {
    redbarkTransactionId: "txn_fk_demo_origin",
    nickname: "Bills",
    dayOffset: -22,
    description: "BPAY ORIGIN ENERGY",
    reference: "BPAY-8831",
    extendedDescription: null,
    amountMinor: -9800,
    direction: "debit",
    status: "posted",
    merchantName: "Origin Energy",
    merchantCategoryCode: null,
    category: "Utilities",
    providerCategory: "utilities",
  },
  {
    redbarkTransactionId: "txn_fk_demo_ferry",
    nickname: "House",
    dayOffset: -40,
    description: "MANLY FERRY",
    reference: "OPAL-FERRY",
    extendedDescription: null,
    amountMinor: -920,
    direction: "debit",
    status: "posted",
    merchantName: "Transport for NSW",
    merchantCategoryCode: "4111",
    category: "Transport",
    providerCategory: "transit",
  },
  {
    redbarkTransactionId: "txn_fk_demo_backfill",
    nickname: "Shares",
    dayOffset: -400,
    description: "BACKFILL DIVIDEND CBA",
    reference: "CBA-2025",
    extendedDescription: "Older dividend inside a two-year backfill",
    amountMinor: 9400,
    direction: "credit",
    status: "posted",
    merchantName: null,
    merchantCategoryCode: null,
    category: "Dividends",
    providerCategory: "investment",
  },
];

export function isCommonwealthInstitution(
  name: string | null | undefined,
  id?: string | null,
): boolean {
  const text = `${name ?? ""} ${id ?? ""}`.toLowerCase();
  return text.includes("commonwealth") || text.includes("commbank") || /\bcba\b/.test(text);
}

export function mockAccountByNickname(nickname: string): MockAccountSpec | undefined {
  return MOCK_ACCOUNTS.find((account) => account.nickname === nickname);
}

export function transactionsInWindow(today: string, from: string, to: string) {
  return MOCK_TRANSACTIONS.flatMap((spec) => {
    const date = addDays(today, spec.dayOffset);
    if (date < from || date > to) return [];
    return [{ ...spec, date }];
  });
}

export const MOCK_INSTITUTION = {
  id: "inst_fk_cba",
  name: FIRST_BANK_NAME,
  logo: null as string | null,
};
