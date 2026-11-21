---
title: Politics — parties, elections and laws
description: "From party member to cabinet minister."
order: 12
category: "Politics & state"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Politics — parties, elections and laws

Politics decides who levies taxes, declares war and funds research. This guide
takes you from ordinary member to cabinet.

<Mermaid label="The political path" chart={"flowchart TD\nR[Choose a region] --> P[Join or found a party]\nP --> W[Elections: field candidates]\nW --> M[Parliament / office]\nM --> V[Submit proposals]\nV --> A[Vote]\nA --> G[Law / budget]\nM --> K[Cabinet: minister posts]\nK --> B[Bloc & foreign affairs]"} />

## 1. Parties

Open `/party` to found or join a party. Parties have members, roles, platforms
and a logo. Your party often decides which proposals reach a majority.

## 2. Elections

Elections run on two levels:

- **Parliamentary elections** in your state (`/state/[id]/election`),
- **Bloc elections** for bloc leadership (`/bloc/[id]`).

Help your side by writing posts and reaching voters. Results appear in
`/election/[id]`.

## 3. Proposals

Under `/state/[id]/proposal/create` you can submit laws: taxes, buildings,
borders, war, exploitation and more. After the debate parliament votes; the
cron applies passed proposals.

## 4. Cabinet and ministers

Presidents and ministers (`/state/[id]`) run portfolios. Common ones are
**Economy**, **Defense** and **Foreign Affairs**. Ministers can authorise
repairs, convoys or intelligence work.

## 5. Blocs and foreign affairs

Blocs group states. High representatives and diplomats negotiate sanctions,
trade lanes and declarations of war (`/bloc` and
`/state/[id]/foreign-affairs`).

## 6. Stability

Public opinion, supply and internal tension decide whether your state stays
stable. The current values are shown on `/state/[id]`.
