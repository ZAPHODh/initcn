/**
 * Drizzle Schema for Stripe Subscriptions
 * Add these to your existing Drizzle schema
 */

import {
	pgTable,
	text,
	timestamp,
	boolean,
	index,
	pgEnum,
} from "drizzle-orm/pg-core";

// Plan type enum
export const planTypeEnum = pgEnum("plan_type", ["FREE", "SIMPLE", "PRO"]);

// Add these fields to your existing users table
export const users = pgTable("user", {
	id: text("id").primaryKey(),
	// ... your existing user fields ...

	// Stripe subscription fields
	stripeCustomerId: text("stripe_customer_id").unique(),
	stripeSubscriptionId: text("stripe_subscription_id").unique(),
	stripePriceId: text("stripe_price_id"),
	stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
	planType: planTypeEnum("plan_type").default("FREE").notNull(),

	// ... rest of your user fields ...
});

// Webhook event tracking table
export const stripeWebhookEvents = pgTable(
	"stripe_webhook_event",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		stripeEventId: text("stripe_event_id").unique().notNull(),
		type: text("type").notNull(),
		processed: boolean("processed").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		processedIdx: index("stripe_webhook_event_processed_idx").on(
			table.processed,
		),
		stripeEventIdIdx: index("stripe_webhook_event_stripe_event_id_idx").on(
			table.stripeEventId,
		),
	}),
);
