# Workflow

- Whenever `src/lib/server/schema.ts` changes, apply it to the database with `bun x drizzle-kit push` (non-interactive; only prompts/blocks on destructive/data-loss changes, which need manual review).
- When a task is finished, commit the changes with `git commit`. Do **not** run `git push` — publishing is handled manually outside this repo.
