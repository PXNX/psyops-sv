# Workflow

- Whenever `src/lib/server/schema.ts` changes, apply it to the database with `bun x drizzle-kit push` (non-interactive; only prompts/blocks on destructive/data-loss changes, which need manual review).
- When a task is finished, run `git push` to publish the commits.
