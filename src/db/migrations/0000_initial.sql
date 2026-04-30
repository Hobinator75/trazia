CREATE TABLE `achievement_unlocks` (
	`id` text PRIMARY KEY NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch()) NOT NULL,
	`triggering_journey_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`triggering_journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievement_unlocks_achievement_id_unique` ON `achievement_unlocks` (`achievement_id`);--> statement-breakpoint
CREATE TABLE `journey_companions` (
	`journey_id` text NOT NULL,
	`companion_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`journey_id`, `companion_name`),
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journey_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`photo_uri` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journey_tags` (
	`journey_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`journey_id`, `tag`),
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`from_location_id` text NOT NULL,
	`to_location_id` text NOT NULL,
	`date` text NOT NULL,
	`start_time_local` text,
	`end_time_local` text,
	`start_timezone` text,
	`end_timezone` text,
	`operator_id` text,
	`vehicle_id` text,
	`service_number` text,
	`cabin_class` text,
	`seat_number` text,
	`parent_journey_id` text,
	`distance_km` real,
	`duration_minutes` integer,
	`route_type` text,
	`route_points_json` text,
	`notes` text,
	`rating` integer,
	`weather` text,
	`is_manual_entry` integer DEFAULT true NOT NULL,
	`source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`from_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`operator_id`) REFERENCES `operators`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `journeys_date_idx` ON `journeys` (`date`);--> statement-breakpoint
CREATE INDEX `journeys_mode_idx` ON `journeys` (`mode`);--> statement-breakpoint
CREATE INDEX `journeys_from_location_idx` ON `journeys` (`from_location_id`);--> statement-breakpoint
CREATE INDEX `journeys_to_location_idx` ON `journeys` (`to_location_id`);--> statement-breakpoint
CREATE INDEX `journeys_operator_idx` ON `journeys` (`operator_id`);--> statement-breakpoint
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
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `locations_iata_idx` ON `locations` (`iata`);--> statement-breakpoint
CREATE INDEX `locations_icao_idx` ON `locations` (`icao`);--> statement-breakpoint
CREATE INDEX `locations_ibnr_idx` ON `locations` (`ibnr`);--> statement-breakpoint
CREATE INDEX `locations_unlocode_idx` ON `locations` (`unlocode`);--> statement-breakpoint
CREATE INDEX `locations_type_idx` ON `locations` (`type`);--> statement-breakpoint
CREATE TABLE `operators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`modes` text NOT NULL,
	`country` text,
	`logo_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_journeys` (
	`trip_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`trip_id`, `journey_id`),
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_id`) REFERENCES `journeys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`cover_photo_uri` text,
	`is_private` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`category` text,
	`manufacturer` text,
	`model` text,
	`capacity` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
