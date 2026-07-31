-- Support personal posts: articles without an associated newspaper.
--
-- The application UI offers a "Personal Post" option that submits no
-- newspaper_id, and article consumers already guard on `{#if article.newspaperId}`,
-- so newspaper_id must be nullable.

ALTER TABLE articles ALTER COLUMN newspaper_id DROP NOT NULL;
