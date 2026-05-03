-- Plain-SQL definition of the THREE SYSTEM-SEED TABLES (locations,
-- operators, vehicles). This file is the single source of truth used by:
--   1) scripts/build-seed-db.ts — to materialise the pre-built seed-DB
--      asset shipped with the app bundle.
--   2) src/db/__tests__/seedDb.test.ts — to verify the file stays in sync
--      with the Drizzle migrations under src/db/migrations/.
--
-- IMPORTANT: when changing locations / operators / vehicles, edit BOTH
-- the Drizzle schema (src/db/schema.ts) AND this file. The matching test
-- compares `PRAGMA table_info` between a freshly migrated DB and one
-- built from this script and will fail loudly on drift.
--
-- Column order matters: SQLite ALTER TABLE ADD COLUMN appends, so the
-- order below mirrors what `0000_initial.sql` then `0001_seed_columns.sql`
-- yield at runtime — `is_system_seed` last on every table, and `code`
-- after `updated_at` on `vehicles`.

CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`country` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`type` text NOT NULL,
	`iata` text,
	`icao` text,
	`ibnr` text,
	`unlocode` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`is_system_seed` integer DEFAULT false NOT NULL
);
CREATE INDEX `locations_iata_idx` ON `locations` (`iata`);
CREATE INDEX `locations_icao_idx` ON `locations` (`icao`);
CREATE INDEX `locations_ibnr_idx` ON `locations` (`ibnr`);
CREATE INDEX `locations_unlocode_idx` ON `locations` (`unlocode`);
CREATE INDEX `locations_type_idx` ON `locations` (`type`);

CREATE TABLE `operators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`modes` text NOT NULL,
	`country` text,
	`logo_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`is_system_seed` integer DEFAULT false NOT NULL
);
CREATE INDEX `operators_code_idx` ON `operators` (`code`);

CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`category` text,
	`manufacturer` text,
	`model` text,
	`capacity` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`code` text,
	`is_system_seed` integer DEFAULT false NOT NULL
);
CREATE INDEX `vehicles_code_idx` ON `vehicles` (`code`);
