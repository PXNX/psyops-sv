---
title: Economy — money, factories and market
description: "From your first job to your own company group."
order: 11
category: "Everyday life & economy"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
  import DocPhoto from "../component/docs/DocPhoto.svelte";

</script>

# Economy — money, factories and market

Money fuels almost every decision. This guide shows how to earn it, invest it
in production and sell the output on the market.

<Mermaid label="The economic loop" chart={"flowchart LR\nA[Work in a factory] --> B[Wage to wallet]\nB --> C[Buy raw materials]\nC --> D[Factory produces goods]\nD --> E[Sell goods on market]\nE --> B\nD --> F[Company: shares & dividends]"} />

<DocArt kind="production" label="From raw material to reinvestment" caption="Follow one credit through the chain: inputs, factory time, market fees, then wages, shares or a new ship." />

![Industry and production](/images/docs/industry.webp)

## 1. Earn money

- Work in a **factory** (`/production`) — your wage goes to your wallet.
- Sell goods on the **market** (`/market`).
- Found a **company** (`/company`) and hold shares in factories.

The overview (`/`) shows your balance and current income.

## 2. Raw materials and production

1. Open `/production` and select a factory.
2. Check which **raw materials** and **products** it needs.
3. Buy shortages on the market.
4. Start production; the output goes to your inventory.

Basic resources include iron, copper, coal and wood from mines; strategic
resources (oil, gas, uranium, rare earth, silicon) unlock later.

## 3. Companies and shares

A company bundles factories and workers. **Shares** can be bought and sold;
profits are paid out as **dividends**. The company page shows yield and
payout history.

Going public files an IPO at a **determined price**: the company's cash plus
the book value of its factories (`stocks.config.ts`), divided across 1,000
shares. The float does not trade immediately — it takes **72 hours** to be
listed on the market, after which the hourly listing cron places it on the
order book automatically.

Expanding a factory costs **20,000 per added post** from the company budget
and takes **24 hours** before the new posts come online. Wages have to stay
fair: a weekly cycle (`/api/cron/strikes`) compares the posted wage with a
1,500 living wage, other factories in the region, local hardship and what the
company can afford. The bigger the gap, the harder the strike and the more
output is lost. A strike ends only when the owner pays the demanded wage, which
then becomes that factory's minimum. Each clean, uninterrupted shift adds a
small productivity bonus, capped at +50%; a strike resets the run. Factory and
company pages show **EBITDA** — output value minus wages and materials, before
interest, tax and depreciation.

## 4. Market

The market keeps a **price history** and **orders**. Buy when many are selling
and sell when prices are high. Every trade is recorded in `/transactions`.

<Mermaid label="Price discovery" chart={"sequenceDiagram\nparticipant U as You\nparticipant M as Market\nparticipant B as Other players\nU->>M: List goods at a price\nB->>M: Buy and sell orders\nM-->>U: Price history and fills\nU->>U: Buy low, sell high, pay the 2% fee"} />

## 5. Public finances

As an office holder you manage the **budget** (`/state/[id]/budget`), set
**taxes** and issue **bonds** (`/bonds`). State spending and revenue appear in
the budget ledger.

## 6. Under the hood

The numbers live in `economy.config.ts`, `production.config.ts` and
`market-price.ts`. See [Naval warfare](/docs/navy) for investing state funds in
ships.


## Deep dive: exact numbers

These values come straight from `economy.config.ts`, `production.config.ts`,
`resources.config.ts`, `investments.config.ts` and `research.config.ts`.

### Starting values and fees (`economy.config.ts`)

| Key | Value |
| --- | --- |
| `INITIAL_USER_WALLET` | 10,000 |
| `DEFAULT_FACTORY_WAGE` | 1,500 per worker |
| `DEFAULT_FACTORY_MAX_WORKERS` | 10 |
| `DEFAULT_PRODUCTION_RATE` | 10 |
| `WORK_COOLDOWN_HOURS` | 24 |
| `MARKET_LISTING_FEE` | 100 |
| `MARKET_TRANSACTION_FEE_PERCENT` | 2% |
| `MAX_LISTINGS_PER_USER` | 50 |
| `COMPANY_CREATION_COST` | 50,000 |
| `FACTORY_CREATION_COST` | 100,000 |
| `IPO_TOTAL_SHARES` | 1,000 (founder locked 51%) |
| `MIN_SHARE_PRICE` | 1 |
| `STOCKS.LISTING_HOURS` | 72 (filing → listing) |
| `STOCKS.FACTORY_BOOK_VALUE` | 100,000 per factory |
| `FACTORY_FINANCE.EXPANSION_POSTS` | 5 per works |
| `FACTORY_FINANCE.EXPANSION_COST_PER_POST` | 20,000 |
| `FACTORY_FINANCE.EXPANSION_HOURS` | 24 |
| `FACTORY_FINANCE.LIVING_WAGE` | 1,500 |
| `FACTORY_FINANCE.STRIKE_MIN_INTERVAL_DAYS` | 7 |
| `FACTORY_FINANCE.PRODUCTIVITY_PER_SHIFT` | +0.5% per clean shift (cap +50%) |

Default tax rates (`DEFAULT_TAX_RATES`): mining **10%**, production **15%**,
market transactions **5%**, income **20%**.

### Production recipes (`production.config.ts`)

| Product | Inputs | Output | Time |
| --- | --- | --- | --- |
| rifles | 5 iron, 3 steel, 2 wood | 10 | 3,600 s (1 h) |
| ammunition | 3 copper, 2 gunpowder | 100 | 1,800 s (30 min) |
| artillery | 10 steel, 8 iron, 5 gunpowder | 2 | 7,200 s (2 h) |
| vehicles | 15 steel, 10 iron, 5 copper | 1 | 10,800 s (3 h) |
| explosives | 10 gunpowder, 3 steel | 20 | 2,700 s (45 min) |
| chips | 8 silicon, 3 rare earth, 2 copper | 5 | 14,400 s (4 h) |
| machine tools | 20 steel, 10 iron, 5 copper | 3 | 21,600 s (6 h) |
| fab equipment | 2 machine tools, 5 chips, 3 rare earth | 1 | 36,000 s (10 h) |

Factory shifts use `SHIFT_RECIPES`: steel = 10 iron + 5 coal → 5; gunpowder =
5 coal + 5 wood → 5; fuel = 10 oil → 10; enriched uranium = 10 uranium → 1.

### Resource values and exploitation (`resources.config.ts`)

`RESOURCE_VALUE`: iron 20, copper 30, coal 15, wood 10, oil 45, gas 40,
uranium 120, rare earth 90, silicon 60.

`EXPLOITATION_POLICIES` multiply output and depletion: conservation **0.7 /
0.8**, standard **1 / 1**, industrial **1.35 / 1.3**, unrestricted **1.75 /
1.8**. Mine yield is `floor(baseRate × outputMult × (0.25 + 0.75 × richness))`,
with a minimum yield of 0.25.

### Dividends and bonds

Dividends (`economy.config.ts`): `DIVIDEND_RATE_PERCENT` 5%, cooldown 24 h,
minimum 1 per share and 1,000 total, yield window 30 days. Bonds
(`investments.config.ts`): minimum principal 1,000, coupon 5%, term 90 days,
coupon period 14 days, earnings reported every 14 days.

### Research (`research.config.ts`)

Cost is `baseCost × costGrowth^level`, rounded to 1,000. Each level grants
`effectPerLevel`.

| Area | Max | Base cost | Growth | Bonus / level | Requires |
| --- | --- | --- | --- | --- | --- |
| health | 5 | 400,000 | 1.55 | 3% | — |
| antivirus | 5 | 700,000 | 1.6 | 5% | health 1 |
| production | 5 | 450,000 | 1.5 | 4% | — |
| fabrication | 4 | 900,000 | 1.65 | 5% | production 1 |
| ai | 5 | 1,200,000 | 1.7 | 3% | fabrication 1 |
| power efficiency | 5 | 500,000 | 1.5 | 4% | — |
| trade | 4 | 400,000 | 1.5 | 4% | — |
| land defence | 5 | 600,000 | 1.55 | 4% | — |
| air defence | 5 | 700,000 | 1.55 | 4% | land defence 1 |
| naval defence | 4 | 650,000 | 1.55 | 4% | land defence 1 |
| space | 4 | 1,000,000 | 1.65 | 4% | ai 1 |

Example: production level 2 costs `450,000 × 1.5² = 1,012,500` → rounded to
**1,013,000**.

### Worked example — your first 1,000 rifles

Ten rifles need 5 iron (value 20 each), 3 steel (50) and 2 wood (10) =
**270 credits** of raw materials, and one hour of factory time. With the 15%
production tax and 2% market fee, selling 10 rifles at the market price must
cover roughly 17% overhead before profit.
