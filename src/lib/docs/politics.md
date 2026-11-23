---
title: Politics — parties, elections and laws
description: "From party member to cabinet minister."
order: 12
category: "Politics & state"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";

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

A parliamentary result is half ballot box, half balance sheet. Cast ballots by
residents make up half of the effective vote; the other half comes from the
state's oligarchs, weighted by their wealth and loyalty to a party. Who they
back depends on the party's appeal: public goodwill, the reputation of its
president, the current economic mood, the party's ideology relative to the
state's political orientation, and any propaganda working for or against it.
Winning the room is often a better investment than winning the argument.

<DocArt kind="election" label="The effective vote" caption="Half the result comes from ballots, half from oligarchs backing your party with wealth and loyalty." />

Help your side by writing posts and reaching voters. Results appear in
`/election/[id]`.

## 3. Proposals

Under `/state/[id]/proposal/create` you can submit laws: taxes, buildings,
borders, war, exploitation and more. After the debate parliament votes; the
cron applies passed proposals.

<Mermaid label="Life of a proposal" chart={"stateDiagram-v2\n[*] --> Draft: Submit law\nDraft --> Debate: Parliament reads it\nDebate --> Vote: Majority reached\nDebate --> Rejected: No majority\nVote --> Law: Cron applies\nVote --> Rejected: Voted down\nLaw --> [*]\nRejected --> [*]"} />

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

<DocArt kind="stability" label="Stability bands" caption="A state starts at 50, “stable”. Below 32 it is uneasy; below 18 it is in unrest and can sustain only a short war." />


## Deep dive: exact numbers

### Government structure (`government.config.ts`)

One president and **4** paired portfolios (**science_health**,
**economy_energy**, **foreign_trade**, **defence_interior**) covering **8**
ministries. Blocs mirror this with High Representatives and a leader. Holding
multiple roles is allowed (`MULTIPLE_ROLES_ALLOWED: true`).

### Opinion and stance (`civic.config.ts`)

`OPINION_CONFIG` starts at **50**; casualties cost **2** opinion per 1,000
(cap 25). State buildings add opinion: infrastructure +1, education +2,
hospitals +3, economy +1, fortifications **−2**, radar 0.

`STANCE_CONFIG` runs from −100 to +100, default 0: declaring war **−18**, an
airstrike **−5**, a bailout **+12** plus +1 per 10,000 above the 10,000 minimum
(cap +30). Labels: hostile ≤−50, unfriendly ≤−10, friendly ≥10, warm ≥50.

### Stability as a political constraint (`stability.config.ts`)

Stability starts at **50** and is labelled loyal ≥70, stable ≥48, uneasy ≥32,
unrest ≥18, collapsing ≥0. War crimes cost −0.4 per point (cap −25),
conscription −1.2 per permille (cap −18), cyber events −0.25 per point (cap
−10). Education adds +1.2 per level (cap +12); rallying defence adds +8.
Stability scales morale 0.9–1.1× and the war exhaustion limit 0.8–1.2× — so a
collapsing state cannot sustain a long war.

### Trade closures (`trade.config.ts`)

| Closure | Cost per hour | Duration | Cooldown | Flow cut | Attribution |
| --- | --- | --- | --- | --- | --- |
| airspace | 9,000 | 6–168 h | 24 h | 95% | 25% |
| EEZ | 6,000 | 6–168 h | 24 h | 80% | 15% |

A blockade additionally cuts sea flow by `blockadeStrength × 0.6`.

### Research as policy (`research.config.ts`)

Research cost is `baseCost × growth^level` rounded to 1,000, with effects from
3% to 5% per level. Labs produce `labs × (1 + 0.25 × aiLevel)` research points
per day. The full tree and prerequisites are listed in the
[economy reference](/docs/economy).

### Worked example — funding a law

A proposal that raises the mining tax from **10%** to **15%**
(`DEFAULT_TAX_RATES`) needs a parliamentary majority. Once passed, every mined
unit yields 5% more to the treasury, but the stability modifier for harsh
environment policies can still apply if exploitation is set to unrestricted
(−12 stability).
