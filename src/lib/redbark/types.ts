export type RedbarkMoney = {
  amount: number;
  currency: string;
} | null;

export type RedbarkAccountItem = {
  id: string;
  object: "account_item";
  connection: string;
  provider: string;
  category: "banking" | "brokerage";
  name: string;
  type: string;
  institution: { id: string; name: string; logo: string | null };
  account_number: string | null;
  currency: string;
  status: string;
  last_updated_at: string | null;
  livemode: boolean;
};

export type RedbarkList<T> = {
  object: "list";
  data: T[];
  next_page_url: string | null;
  previous_page_url: string | null;
};

export type RedbarkBalance = {
  object: "balance";
  account: string;
  current: RedbarkMoney;
  available: RedbarkMoney;
  currency: string | null;
  observed_at: string | null;
  freshness: "fresh" | "stale" | "unavailable" | null;
  livemode: boolean;
};

export type RedbarkTransaction = {
  id: string;
  object: "transaction";
  account: string;
  status: string;
  date: string;
  datetime: string | null;
  description: string;
  reference: string | null;
  extended_description: string | null;
  amount: { amount: number; currency: string };
  direction: string;
  provider_category: string | null;
  category: string | null;
  merchant_name: string | null;
  merchant_category_code: string | null;
  livemode: boolean;
};

export type RedbarkMe = {
  id: string;
  timezone: string;
  key: {
    id: string;
    name: string;
    scopes: string[];
    legacy: boolean;
  } | null;
};
