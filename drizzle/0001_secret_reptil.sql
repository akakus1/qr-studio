CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(512) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`coverImageUrl` varchar(1024),
	`authorId` int,
	`tags` text,
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `qr_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(16) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'Untitled QR',
	`type` enum('url','text','wifi','vcard','email','phone','instagram','location','pdf') NOT NULL DEFAULT 'url',
	`content` text NOT NULL,
	`isDynamic` boolean NOT NULL DEFAULT false,
	`customisation` text,
	`scanCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qr_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_codes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `scan_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`qrCodeId` int NOT NULL,
	`country` varchar(64),
	`city` varchar(128),
	`device` enum('mobile','tablet','desktop','unknown') DEFAULT 'unknown',
	`os` varchar(64),
	`browser` varchar(64),
	`referrer` varchar(512),
	`ip` varchar(64),
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','pro','business') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `planExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);