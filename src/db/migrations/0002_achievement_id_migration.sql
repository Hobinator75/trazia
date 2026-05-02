-- Migration 0002: rename achievement IDs to align with the spec naming.
-- atlantic_crosser → transatlantic (the catalog v2 entry has the new id).
-- Existing unlock rows are migrated in place; the unique index on
-- achievement_id allows the rename only because the new id isn't yet used.
UPDATE achievement_unlocks SET achievement_id = 'transatlantic'
  WHERE achievement_id = 'atlantic_crosser';
