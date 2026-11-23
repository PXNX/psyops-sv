---
title: Community — chat, posts and newspapers
description: "Talk, publish and build reputation."
order: 13
category: "Everyday life & economy"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";

</script>

# Community — chat, posts and newspapers

Politics and economics happen between people. This guide shows how to
coordinate and spread news.

<DocArt kind="levers" label="Influence is a lever" caption="Chat, posts and papers change what people accept long before you have to pay for force." />

<Mermaid label="Communication channels" chart={"flowchart TD\nA[Chat / Comms] --> B[Global, party, state, bloc or direct]\nC[Posts] --> D[Feed & subscriptions]\nD --> E[Upvotes & reach]\nF[Newspaper] --> G[Write articles]\nG --> H[Readers & statistics]\nH --> E\nE --> I[Reputation & influence]"} />

## 1. Chat

`/chat` has rooms for everyone, parties, states, blocs and direct messages.
Rules apply everywhere; violations can be reported. Official messages arrive
in `/inbox`.

## 2. Posts

Write posts under `/posts`, subscribe to others and upvote content. Posts are
the fastest way to spread an opinion.

## 3. Newspapers

In `/newspaper` found a paper, hire journalists and publish articles. Reach
and statistics show how many players you influence.

## 4. Moderation and reputation

Reports and moderators keep order. Valuable contributions build reputation,
which helps in elections and when applying for offices.

<Mermaid label="A campaign that pays off" chart={"sequenceDiagram\nparticipant A as Your paper\nparticipant R as Readers\nparticipant S as State\nA->>R: Publish article\nR-->>A: Reach and upvotes\nA->>S: Public opinion shifts\nS->>S: Stability += 0.4 × opinion\nS-->>A: Better election odds"} />

## 5. Profile

Your profile (reachable from the menu) collects medals, offices, companies and
the interactive tutorial launchers.


## Deep dive: exact numbers

Community actions feed the same opinion and stability systems as politics.
The relevant constants are in `civic.config.ts` and `stability.config.ts`.

| Key | Value | Source |
| --- | --- | --- |
| `OPINION_CONFIG.BASE` | 50 | civic.config.ts |
| `CASUALTY_PENALTY_PER_THOUSAND` | 2 (cap 25) | civic.config.ts |
| Opinion from a clinic | +9 for 55,000 over 10 days | civic.config.ts |
| Opinion from a school annex | +7 for 45,000 over 9 days | civic.config.ts |
| Propaganda for | +0.4 per point (cap +8) | stability.config.ts |
| Propaganda against | −0.35 per point (cap −12) | stability.config.ts |
| `STABILITY.OPINION_WEIGHT` | 0.4 | stability.config.ts |
| Rally defence | +8 stability | stability.config.ts |

A post or article that changes public opinion by 20 points moves stability by
roughly `20 × 0.4 = 8` points. Because stability labels change at 70, 48, 32
and 18, a well-timed campaign can move a state from "uneasy" to "stable"
without firing a shot.

The moderation rules and chat restrictions are enforced in
`src/lib/server/moderation/`; the numeric thresholds for warnings and mutes
live there rather than in the game config.
