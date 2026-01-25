import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const planTypeEnum = pgEnum("plan_type", ["FREE", "SIMPLE", "PRO"]);

export const stripeWebhookEvents = pgTable(
	"stripe_webhook_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		stripeEventId: text("stripe_event_id").notNull().unique(),
		type: text("type").notNull(),
		processed: boolean("processed").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		processedIdx: index("stripe_webhook_events_processed_idx").on(
			table.processed,
		),
		stripeEventIdIdx: index("stripe_webhook_events_stripe_event_id_idx").on(
			table.stripeEventId,
		),
	}),
);

export const users = pgTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	stripeCustomerId: text("stripe_customer_id").unique(),
	stripeSubscriptionId: text("stripe_subscription_id").unique(),
	stripePriceId: text("stripe_price_id"),
	stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
	planType: planTypeEnum("plan_type").notNull().default("FREE"),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type User = typeof users.$inferSelect;
