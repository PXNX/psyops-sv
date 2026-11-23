-- Reddit-style threaded replies for post comments.

ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "parent_id" integer REFERENCES "comments"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_comment_parent" ON "comments" ("parent_id");
