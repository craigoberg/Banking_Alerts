# Banking Alerts

Commonwealth Bank balances, via RedBark, with a daily check that emails when an account stays under its threshold.

The local app runs with no RedBark, Supabase, or Postmark credentials. It signs in against a sample user and shows sample balances for House, Bills, MasterCard, Shares, Finley, Killian, and Alfred.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:47231](http://127.0.0.1:47231).

Sign in:

- Username: `demo`
- Password: `local-demo`

That password is only for this local sample. It is stored as a hash. There is no reset flow.

```bash
npm test
npm run lint
```

## What you can do

- Balances are cards. A card is marked Under while the balance is under that account’s threshold.
- Cards start in one group named Accounts. You can create, rename, and delete groups, drag cards to reorder them or move them between groups, and collapse a group. Collapsing hides the cards and keeps the header. Transactions stay in one list.
- Transactions filter by account, month, and date. Opening the app shows the current month to date in Australia/Sydney: the 1st through today. The month control keeps that rule for the current month. Earlier months are the full calendar month, and the control does not move into a future month or before seven years ago. Search matches every column, including description, reference, merchant, category, status, direction, and amount. Income and expense totals sit above the list and follow the account, dates, and search together. Income is the sum of positive amounts. Expenses are the sum of negative amounts.
- Accounts can be added, renamed, or removed. Banks are records too. The first bank is Commonwealth Bank.
- Settings change the alert recipient (default `craig@oberg.com.au`, from `alert@oberg.com.au`), the Australia/Sydney time, and the pull window.
- The first pull covers 31 days, and the morning job keeps using that saved window. Raise the window to backfill up to seven years, use Run pull now, then set it back to about 31 days. Choosing an older date only shows transactions already stored.
- Without a Postmark token, Run pull now logs the email that would have been sent. The screen still loads.

## Sydney database

Create a Supabase database in Craig’s existing account, region Oceania (Sydney), `ap-southeast-2`. Run:

`supabase/migrations/20260925120000_banking_alerts.sql`

`supabase/migrations/20260927120000_account_groups.sql`

`supabase/migrations/20260929120000_seven_year_pull_window.sql`

The first file creates banks, accounts, balances, transactions, thresholds, logins, alert state, settings, discovered RedBark accounts, pull history, and the email log. It seeds Commonwealth Bank and the seven nicknames. It does not insert a password or an API key. The second file adds account groups and places those nicknames in a group named Accounts. The third file raises the pull-window check from 731 days to 2558 days. Run all three, in that order.

Then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and create the real login:

```bash
DEMO_USERNAME=... DEMO_PASSWORD=... npm run seed-login
```

The script writes a hash. It does not print the password.

After the first live pull, match each nickname to a Commonwealth Bank account on the Accounts page, then pull again.

## Schedule

`vercel.json` calls `/api/cron/daily` at `0 18 * * *` and `0 19 * * *` UTC. One of those is 5:00 in Australia/Sydney, depending on daylight saving. The route runs only when the current Sydney time matches the hour and minute saved in the app (default 05:00). Set `CRON_SECRET` in production. Vercel should send `Authorization: Bearer <CRON_SECRET>`.

If the saved time is not 5:00, copy the cron expressions shown on Settings into `vercel.json` and redeploy. Two daily cron entries may need a Vercel plan that allows more than one run per day.

## Environment

Copy `.env.example` to `.env.local`. Leave the values blank for the demo. Never commit real keys.

| Name | Purpose |
| --- | --- |
| `REDBARK_API_KEY` | Live RedBark key. The first pull checks that it includes `data:read`. |
| `REDBARK_VERSION` | Defaults to `2026-10-01.wattle`. |
| `SUPABASE_URL` | Sydney project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key. The browser never sees it. |
| `POSTMARK_SERVER_TOKEN` | Sends mail. Blank logs the message instead. |
| `SESSION_SECRET` | Signs the login cookie. Required in production. |
| `CRON_SECRET` | Authorizes the Vercel cron route. |

The Postmark inbound address is not the alert recipient.

## Still needed for live data

- RedBark key in Vercel, and confirmation that its scopes include `data:read`
- Supabase URL and service role for the new Sydney database, after the migration
- Postmark server token, with `alert@oberg.com.au` allowed to send
- `SESSION_SECRET` and `CRON_SECRET`
- The real username, via `npm run seed-login` (not the local `demo` user)
- Nicknames matched to the live Commonwealth Bank accounts after the first pull
