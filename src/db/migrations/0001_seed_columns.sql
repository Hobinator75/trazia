ALTER TABLE `locations` ADD `is_system_seed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `operators` ADD `is_system_seed` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `operators_code_idx` ON `operators` (`code`);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `is_system_seed` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `vehicles_code_idx` ON `vehicles` (`code`);