-- Account groups for the balance board.
-- Run after 20260925120000_banking_alerts.sql in the Sydney database (ap-southeast-2).
-- Cards belong to a group. Transaction rows are not grouped.
-- The seven nicknames start in one group named Accounts.

create table if not exists account_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null,
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table accounts add column if not exists group_id uuid references account_groups (id);
alter table accounts add column if not exists sort_order integer not null default 0;

insert into account_groups (id, name, sort_order, collapsed)
values ('33333333-3333-4333-8333-333333333301', 'Accounts', 0, false)
on conflict (id) do nothing;

update accounts
set
  group_id = '33333333-3333-4333-8333-333333333301',
  sort_order = case id
    when '22222222-2222-4222-8222-222222222201' then 0
    when '22222222-2222-4222-8222-222222222202' then 1
    when '22222222-2222-4222-8222-222222222203' then 2
    when '22222222-2222-4222-8222-222222222204' then 3
    when '22222222-2222-4222-8222-222222222205' then 4
    when '22222222-2222-4222-8222-222222222206' then 5
    when '22222222-2222-4222-8222-222222222207' then 6
    else sort_order
  end
where group_id is null
  and id in (
    '22222222-2222-4222-8222-222222222201',
    '22222222-2222-4222-8222-222222222202',
    '22222222-2222-4222-8222-222222222203',
    '22222222-2222-4222-8222-222222222204',
    '22222222-2222-4222-8222-222222222205',
    '22222222-2222-4222-8222-222222222206',
    '22222222-2222-4222-8222-222222222207'
  );

with ordered as (
  select id, row_number() over (order by nickname) - 1 as ord
  from accounts
  where group_id is null
)
update accounts as account
set
  group_id = '33333333-3333-4333-8333-333333333301',
  sort_order = ordered.ord
from ordered
where account.id = ordered.id;

alter table accounts alter column group_id set not null;

create index if not exists accounts_group_sort_idx on accounts (group_id, sort_order);

alter table account_groups enable row level security;
revoke all on table account_groups from anon, authenticated;
