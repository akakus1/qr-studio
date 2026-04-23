CREATE TYPE "public"."device" AS ENUM('mobile', 'tablet', 'desktop', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."qr_type" AS ENUM('url', 'text', 'wifi', 'vcard', 'email', 'phone', 'instagram', 'location', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(128) DEFAULT 'My API Key' NOT NULL,
	"keyHash" varchar(128) NOT NULL,
	"keyPrefix" varchar(16) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(512) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"coverImageUrl" varchar(1024),
	"authorId" integer,
	"tags" text,
	"published" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"slug" varchar(16) NOT NULL,
	"name" varchar(255) DEFAULT 'Untitled QR' NOT NULL,
	"type" "qr_type" DEFAULT 'url' NOT NULL,
	"content" text NOT NULL,
	"isDynamic" boolean DEFAULT false NOT NULL,
	"customisation" text,
	"scanCount" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qrCodeId" integer NOT NULL,
	"country" varchar(64),
	"city" varchar(128),
	"device" "device" DEFAULT 'unknown',
	"os" varchar(64),
	"browser" varchar(64),
	"referrer" varchar(512),
	"ip" varchar(64),
	"scannedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(320) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255) DEFAULT '' NOT NULL,
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"planExpiresAt" timestamp,
	"stripeCustomerId" varchar(128),
	"stripeSubscriptionId" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
