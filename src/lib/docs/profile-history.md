---
title: "Profiles, reputation and map history"
description: "Where karma and reputation come from, what the profile links, and how to replay the world on any past day."
order: 28
category: "Updates & deep dives"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
</script>

# Profiles and history

Two small but useful changes: the numbers on a personnel file now link to pages
that explain them, and the world map can be replayed day by day.

## Karma and reputation on the profile

The profile's key/value grid shows **Articles**, **Upvotes**, **Karma** and
**Reputation**. Only Karma and Reputation are links. Articles and Upvotes are
plain numbers because both are already part of karma: a link to them from the
profile would point at the same data a second time.

<Mermaid label="The two score systems" chart={"flowchart TD\nA[Other players] -->|upvote article| K[Karma]\nA -->|vote on comment| K\nK --> KD[/user/id/karma]\nB[Region civilians] -->|opinion of your region| R[Reputation]\nR --> RD[/user/id/reputation]"} />

### Karma detail — `/user/{id}/karma`

Karma is a stored counter on `user_profiles`. The detail page shows it as the
authoritative total and reconstructs the sources from live vote rows:

- upvotes on the player's articles, excluding self-votes;
- votes on the player's comments, excluding self-votes.

Each is worth one point and is removed again when the vote is withdrawn. The
page lists the most-upvoted articles and most-voted comments. If the current
vote rows do not add up to the recorded total, it says so — votes on deleted
items can leave the counter ahead of the live rows.

### Reputation detail — `/user/{id}/reputation`

Reputation is not a personal attribute. It is the civilian opinion (0–100) of
the **region the player currently lives in**, and it changes when they move.

The page shows the arithmetic, one row per factor:

- a neutral baseline of 50;
- region levels for infrastructure, economy, education, hospitals,
  fortifications and radar, each with its opinion weight;
- completed civic buildings, with their goodwill values;
- a capped penalty for civilian casualties;
- a hardship penalty if the region's supplies are short.

It also lists the player's own completed civic buildings in that region and
the goodwill they contributed. `regionOpinion()` and the breakdown function
share the same code, so the number on the profile and the number on the detail
page can never disagree.

## Map history

The main map toolbar has a **History** button. It opens `/map/history`, which
has a date field at the top. Pick any date and the map is redrawn from the
daily world snapshot closest to it: region colours show who held what, and the
snapshot's state statistics are listed alongside.

<DocArt kind="history" label="Replaying the world" caption="One snapshot per day, kept as JSON — ownership and the numbers behind it." />

Snapshots are written by the `world-snapshot` cron at midnight UTC and stored
in `map_snapshots`. If no snapshot exists for the exact day you type, the page
falls back to the nearest saved day and tells you which date it is showing.
Because snapshots now also carry player resident counts, the residents graph
on the state desk gets more accurate with every passing day.

## Visual documentation

The guides themselves now carry illustrations: `DocArt.svelte` renders
theme-coloured SVG infographics (the four levers of power, production,
stability, cyber, elections and more), `TutorialArt.svelte` draws small scenes
for the interactive tours, and `DocPhoto.svelte` frames photographic plates.
Tutorial panels also show step dots so you can see how far through a walkthrough
you are. All artwork uses active theme colours, including in dark mode.
