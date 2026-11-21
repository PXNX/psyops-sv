---
title: Economy — money, factories and market
description: "From your first job to your own company group."
order: 11
category: "Everyday life & economy"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Economy — money, factories and market

Money fuels almost every decision. This guide shows how to earn it, invest it
in production and sell the output on the market.

<Mermaid label="The economic loop" chart={"flowchart LR\nA[Work in a factory] --> B[Wage to wallet]\nB --> C[Buy raw materials]\nC --> D[Factory produces goods]\nD --> E[Sell goods on market]\nE --> B\nD --> F[Company: shares & dividends]"} />

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

## 4. Market

The market keeps a **price history** and **orders**. Buy when many are selling
and sell when prices are high. Every trade is recorded in `/transactions`.

## 5. Public finances

As an office holder you manage the **budget** (`/state/[id]/budget`), set
**taxes** and issue **bonds** (`/bonds`). State spending and revenue appear in
the budget ledger.

## 6. Under the hood

The numbers live in `economy.config.ts`, `production.config.ts` and
`market-price.ts`. See [Naval warfare](/docs/navy) for investing state funds in
ships.
