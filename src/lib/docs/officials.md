---
title: "Public office — salaries, laws and martial law"
description: "How parliament sets pay for the president, ministers and members, and how a one-week suspension of elections works."
order: 26
category: "Updates & deep dives"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
</script>

# Public office

Parliament controls two powerful levers: how much its own members are paid, and
whether elections happen at all. Both are ordinary proposal types, so they go
through the same bill workflow as taxes and construction.

<Mermaid label="From bill to effect" chart={"flowchart LR\nA[Member tables a bill] --> B{Voting window 1 day}\nB -->|60% for| C[executeProposal]\nB -->|minister / president| D[Signed into law at once]\nD --> C\nC --> E[State policy or effect]"} />

## Tabling a bill

An MP, minister or president opens **Parliament → New bill**. A normal bill is
open for one day and needs 60% of the chamber. A minister can sign their own
portfolio immediately; the president can sign anything. In both cases the bill
is created with `status: "passed"`, a zero majority requirement and
`executeProposal` runs straight away.

Two new bill subjects appear in the picker:

- **Official salaries** — belongs to the economy portfolio.
- **Martial law** — belongs to the foreign-affairs and defence portfolios.

Each type stores its payload in its own detail table, keyed by the proposal ID,
and `executeProposal` is the single place where a passed bill is applied. That
means a bill counted by the cron, signed by a minister and accepted manually by
the speaker all produce the same result.

## Official salaries

The bill asks for one number: the **weekly salary of a parliament member**. All
other offices are derived from it:

| Office | Weekly pay |
|---|---|
| Parliament member | base |
| Minister | base × 3 |
| President | base × 5 |

A minister holding two ministries receives two ministerial salaries, as expected
for two jobs. All amounts come from `officials.config.ts`; the multipliers are
`MINISTER_MULTIPLIER` and `PRESIDENT_MULTIPLIER`.

<DocArt kind="election" label="Parliament sets its own pay" caption="One base amount, three fixed multiples — the arithmetic is shown before the bill is tabled." />

### When the money moves

The weekly run lives in `payOfficialSalaries` and is triggered by the
`salaries` cron every **Monday at 05:00 UTC** (`vercel.json`). For each state
whose base salary is above zero and whose last run is at least seven days old:

1. The state claims the period with a conditional update on
   `last_salary_paid_at`. A second run in the same week finds no row and does
   nothing.
2. The treasury is debited with a guarded `UPDATE ... WHERE balance >= total`.
   If the treasury cannot cover the whole run, nothing is paid.
3. Each official's wallet is credited. A wallet is created on first use.
4. The player's `transaction_history` gets an `official_salary` entry; the
   state's `government_budget_transactions` gets a negative `salary` entry
   with the authorising official and a `balanceAfter`.

So a salary shows up in both the player's balance history and the state's
budget ledger. If parliament changes the base midweek, the new amount is stored
immediately and `last_salary_paid_at` is cleared, so the new rate is used at the
next run.

## Martial law

The **Martial law** bill needs no fields: it is always a
`MARTIAL_LAW_DAYS = 7` day declaration. Passing it stamps
`states.martial_law_until` with a future timestamp.

While the timestamp is in the future:

- the hourly `elections` cron does not activate scheduled parliamentary
  elections;
- it defers the count-out of an election that has already finished;
- the vote action refuses every ballot with a clear error;
- the next election is scheduled for the day after martial law expires, rather
  than inside the suspended week;
- the state dossier shows a red banner with the expiry date.

The rule is deliberately **self-expiring**. Like covert-operation effects,
martial law is never switched off by a cron — `isMartialLaw()` compares the
stored timestamp with the current time on every read. A missed cron tick can
delay an election, but it can never extend martial law beyond its week.

Bloc leader elections run on their own 30-day cycle and are unaffected; this
suspension applies to parliamentary elections only.
