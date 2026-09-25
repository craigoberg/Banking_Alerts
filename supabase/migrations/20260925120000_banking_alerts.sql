-- Banking Alerts
-- Run this in the new Supabase database in Oceania (Sydney), region ap-southeast-2.
-- The app talks to Postgres with the service role from the server.
-- No anon policies are granted. Do not put API keys or passwords in this file.

create extension if not exists pgcrypto;

create table banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references banks (id) on delete cascade,
  nickname text not null,
  redbark_account_id text unique,
  provider_name text,
  institution_name text,
  account_number_masked text,
  currency text not null default 'aud',
  category text,
  account_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  current_amount bigint,
  available_amount bigint,
  currency text not null default 'aud',
  observed_at timestamptz,
  freshness text,
  pulled_at timestamptz not null default now()
);

create index balances_account_pulled_idx on balances (account_id, pulled_at desc);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  redbark_transaction_id text not null unique,
  status text,
  posted_on date not null,
  transacted_at timestamptz,
  description text not null default '',
  reference text,
  extended_description text,
  amount_minor bigint not null,
  currency text not null default 'aud',
  direction text,
  provider_category text,
  category text,
  merchant_name text,
  merchant_category_code text,
  created_at timestamptz not null default now()
);

create index transactions_account_date_idx on transactions (account_id, posted_on desc);

create table thresholds (
  account_id uuid primary key references accounts (id) on delete cascade,
  amount_minor bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table logins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table alert_states (
  account_id uuid primary key references accounts (id) on delete cascade,
  under_threshold boolean not null default false,
  last_alert_on date,
  last_resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table settings (
  id integer primary key default 1 check (id = 1),
  schedule_hour integer not null default 0 check (schedule_hour between 0 and 23),
  schedule_minute integer not null default 0 check (schedule_minute between 0 and 59),
  schedule_timezone text not null default 'Australia/Sydney',
  alert_recipient text not null default 'craig@oberg.com.au',
  pull_window_days integer not null default 31 check (pull_window_days between 1 and 731)
);

insert into settings (id) values (1);

create table discovered_accounts (
  redbark_account_id text primary key,
  bank_id uuid references banks (id) on delete set null,
  provider_name text,
  institution_name text,
  name text not null,
  account_number_masked text,
  currency text not null default 'aud',
  category text,
  account_type text,
  status text,
  last_seen_at timestamptz not null default now()
);

create table pull_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  window_from date,
  window_to date,
  detail text not null default ''
);

create table email_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  from_address text not null,
  to_address text not null,
  subject text not null,
  body text not null,
  delivered boolean not null
);

create view account_latest_balances as
select distinct on (account_id)
  id,
  account_id,
  current_amount,
  available_amount,
  currency,
  observed_at,
  freshness,
  pulled_at
from balances
order by account_id, pulled_at desc;

insert into banks (id, name)
values ('11111111-1111-4111-8111-111111111111', 'Commonwealth Bank');

insert into accounts (id, bank_id, nickname) values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'House'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Bills'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'MasterCard'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111111', 'Shares'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111111', 'Finley'),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111111', 'Killian'),
  ('22222222-2222-4222-8222-222222222207', '11111111-1111-4111-8111-111111111111', 'Alfred');

insert into thresholds (account_id, amount_minor)
select id, 0 from accounts;

insert into alert_states (account_id)
select id from accounts;

alter table banks enable row level security;
alter table accounts enable row level security;
alter table balances enable row level security;
alter table transactions enable row level security;
alter table thresholds enable row level security;
alter table logins enable row level security;
alter table alert_states enable row level security;
alter table settings enable row level security;
alter table discovered_accounts enable row level security;
alter table pull_runs enable row level security;
alter table email_log enable row level security;

revoke all on table banks from anon, authenticated;
revoke all on table accounts from anon, authenticated;
revoke all on table balances from anon, authenticated;
revoke all on table transactions from anon, authenticated;
revoke all on table thresholds from anon, authenticated;
revoke all on table logins from anon, authenticated;
revoke all on table alert_states from anon, authenticated;
revoke all on table settings from anon, authenticated;
revoke all on table discovered_accounts from anon, authenticated;
revoke all on table pull_runs from anon, authenticated;
revoke all on table email_log from anon, authenticated;
revoke all on table account_latest_balances from anon, authenticated;
