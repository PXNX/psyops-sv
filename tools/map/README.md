# World map tools

Everything about regions that comes from the map artwork is generated here,
from three committed inputs:

| File              | What it is                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| `worldmap.svg`    | Source artwork. Every shape is named after its place (`Corsica`, `Malaya`). |
| `regions.json`    | Registry: region id ↔ shape ↔ name, plus shapes that are `impassable`.      |
| `projection.json` | Calibration from map coordinates to latitude/longitude.                     |

## Scripts

```bash
bun tools/map/build.ts                                   # regenerate everything below
bun tools/map/fetch-coats.ts                             # coats for regions without one
bun tools/map/optimize-coats.ts                          # slim all coat SVGs (visually checked)
bun tools/map/square-coats.ts                            # same 512x512 square canvas for every coat
DATABASE_URL=... bun tools/map/apply-db.ts               # dry run against a database
DATABASE_URL=... bun tools/map/apply-db.ts --check       # write, then roll back
DATABASE_URL=... bun tools/map/apply-db.ts --apply       # write in one transaction
DATABASE_URL=... bun tools/map/fit-projection.ts         # recalibrate (only if the artwork changes)
```

`build.ts` writes:

- `src/lib/assets/worldmap3.svg`: the map the app renders, shapes renamed to region ids.
- `data/regions.json`: id, name and latitude/longitude (the centre of the shape) per region.
- `data/borders.json`: neighbouring regions and their distance in km.
  - **land**: the outlines run alongside each other;
  - **sea**: the coasts are under ~70 km apart with only water in between;
  - island groups still cut off are joined to their nearest region, so every
    region can be reached.
- `messages/en.json`: a `region_<id>` name for every region that lacks one.

`fetch-coats.ts` saves `static/coats/<id>.svg` from Wikimedia Commons via
Wikidata, only accepting places near the region on the map. It uses the
place's coat of arms or seal, else that of the province or country it lies in;
wrong picks can be pinned in `coat-overrides.json`. Source, author and licence
of every file are kept in `coat-sources.json`.

`optimize-coats.ts` slims the SVGs with svgo and keeps a file's original when
the optimised version renders even slightly differently (run automatically
after fetching; `bun tools/map/optimize-coats.ts` redoes all of them).

`square-coats.ts` puts every coat on the same 512×512 square canvas, the
drawing centred and untouched, so they all render at the same size. Results
that render noticeably differently from the original are listed rather than
written; review them and pass their ids with `--force` (some originals crop
their own drawing, which squaring fixes).

## Adding or changing a region

1. Add or rename the shape in `worldmap.svg` (keep `id` = place name).
2. Add `{ "id": <next id>, "shape": "<shape id>", "name": "<display name>" }`
   to `regions.json` (or list the shape under `impassable`).
3. `bun tools/map/build.ts`, then `bun tools/map/fetch-coats.ts <id>`.
4. `apply-db.ts --check`, then `--apply`, and deploy the code.

`build.ts` refuses to run while a shape has no region or a region points at
a missing shape, so the map and the database can't drift apart again.
