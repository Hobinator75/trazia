-- noop: replaced by code-migration in src/lib/achievements/migration.ts.
-- Intentionally a no-op so the rename `atlantic_crosser → transatlantic`
-- never crashes the app on devices that already hold both unlock rows
-- (the unique index on achievement_id would reject a blind UPDATE).
-- The drizzle journal entry stays in place so existing devices treat
-- this migration as already applied. We use a WHERE-0 UPDATE rather
-- than `SELECT 1` because Drizzle's migrator runs statements through
-- `db.run()` which rejects statements that produce result rows.
UPDATE achievement_unlocks SET achievement_id = achievement_id WHERE 0;
