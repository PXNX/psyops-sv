---
title: "Spy networks — faces, traits and double agents"
description: "Every planted asset is a person now: generated names, portraits and rare traits, plus a very long-shot way to turn the enemy's people."
order: 27
category: "Updates & deep dives"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
</script>

# Spy networks

The `/ops/network` console is the hands-on layer under cyber operations and
psyops. You plant an asset inside a target, then use it to probe sites, watch
cameras, copy files and cover its tracks before the heat burns it.

<Mermaid label="An asset's life" chart={"flowchart LR\nA[Plant asset] --> B[Name + face + traits]\nB --> C[Probe / camera / files]\nC --> D{Heat reaches 100?}\nD -->|yes| E[Burned]\nD -->|no| F[Cover tracks]\nF --> C\nG[Enemy asset in our state] --> H{Turn it? 3%}\nH -->|yes| I[Double agent + files]\nH -->|no| J[Heat +22]"} />

## People, not icons

Every new asset gets a human identity the moment it is planted:

- a **name**, generated deterministically from the state, target and asset
  index — the same person is always the same person;
- a **portrait**, chosen by a deterministic seed from a pool of 24 generated
  faces. The portrait is greyed out when the asset is burned;
- zero to two **bonus traits**.

The card shows the person's name first, with the operation codename in quotes
underneath. The codename is still what the operation ledger records. A small
badge warns you when one of your own assets has been turned against you.

<DocArt kind="cyber" label="A network is made of people" caption="Faces, names and traits make an asset worth protecting — and worth turning." />

## Traits and rarity

Most assets are ordinary. The trait count is rolled once:

| Traits | Chance |
|---|---|
| none | 62% |
| one | 28% |
| two | 10% |

Individual traits are drawn by weight, so a `weight: 5` trait such as *Clean
operator* or *Night owl* is common, `weight: 3` traits are uncommon and
`weight: 1` traits (*Ghost*, *Veteran*) are rare. All definitions live in
`spy-traits.config.ts`.

Traits are not decorative. `spyTraitModifiers()` aggregates them into three
numbers that the infiltration service uses:

- **access** — effective access level, used for the site access check;
- **success** — added to every action's chance;
- **heat** — a multiplier on heat gained. It never makes a "cover tracks"
  action less effective, because the multiplier only applies to positive heat.

Two traits can stack, so a well-connected ghost can reach a sealed site and
stay clean while doing it.

## Turning enemy assets

Assets planted by other states inside **your** state appear in a separate
**Enemy assets in …** section on the network console. They are known through
counter-intelligence; you cannot recruit assets in other target states this way.

Pressing **Turn** attempts to flip one of them:

- the attempt costs `FLIP_COST` (120,000 credits) from your state treasury;
- the chance is `FLIP_CHANCE` — **3%**, deliberately a very long shot;
- on success, the asset's `double_agent_for_state_id` is set to your state and
  its `flipped_at` is stamped. It now works for you and hands over
  `FLIP_SECRETS` files about its former owner. Those files appear in the file
  catalogue when that state is selected as the target;
- on failure, the asset gains `FLIP_HEAT_ON_FAILURE` heat and may burn. The
  attempt is reported to its original handler.

A turned asset shows a green "our double agent" badge and no longer offers the
Turn button. Your own assets that an enemy has turned show a red "double agent"
badge, so you know your network has been compromised.

All flip constants — cost, chance, failure heat and number of secrets — live
in `INFILTRATION` in `infiltration.config.ts`.
