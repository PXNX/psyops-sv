# Workflow

- Whenever `src/lib/server/schema.ts` changes, apply it to the database with `bun x drizzle-kit push` (non-interactive; only prompts/blocks on destructive/data-loss changes, which need manual review).
- When a task is finished, commit the changes with `git commit`. Do **not** run `git push` — publishing is handled manually outside this repo.
- Never ask a user to type a state or region ID into a free-text/number field. Always pick these from a searchable dropdown (`SearchSelect`) whose options show the name followed by `(#id)`, e.g. `Lower Austria (#4)`. This applies to new forms and when replacing existing numeric ID inputs.
