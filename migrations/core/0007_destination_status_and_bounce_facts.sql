ALTER TABLE `contact_email_addresses` ADD COLUMN `channel_status` text NOT NULL DEFAULT 'non-subscribed';
--> statement-breakpoint
ALTER TABLE `contact_email_addresses` ADD COLUMN `channel_status_at` integer;
--> statement-breakpoint
UPDATE `contact_email_addresses`
SET `channel_status` = (SELECT `email_status` FROM `contacts` WHERE `contacts`.`id` = `contact_email_addresses`.`contact_id`),
    `channel_status_at` = (SELECT `email_status_at` FROM `contacts` WHERE `contacts`.`id` = `contact_email_addresses`.`contact_id`);
--> statement-breakpoint
ALTER TABLE `contact_phones` ADD COLUMN `channel_status` text NOT NULL DEFAULT 'non-subscribed';
--> statement-breakpoint
ALTER TABLE `contact_phones` ADD COLUMN `channel_status_at` integer;
--> statement-breakpoint
UPDATE `contact_phones`
SET `channel_status` = (SELECT `sms_status` FROM `contacts` WHERE `contacts`.`id` = `contact_phones`.`contact_id`),
    `channel_status_at` = (SELECT `sms_status_at` FROM `contacts` WHERE `contacts`.`id` = `contact_phones`.`contact_id`);
--> statement-breakpoint
CREATE TABLE `contact_bounce_facts` (
  `provider_event_id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `kind` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_bounce_facts_contact_time_idx` ON `contact_bounce_facts` (`contact_id`, `occurred_at`);
