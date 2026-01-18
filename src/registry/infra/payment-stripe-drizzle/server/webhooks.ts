/**
 * Webhook Event Processing Utilities (Drizzle)
 * Helper functions for processing Stripe webhook events with Drizzle
 */

import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { PlanType } from "payment-stripe-shared";
import { getPlanTypeFromPriceId } from "payment-stripe-shared";
import { stripe } from "../db";

/**
 * Process checkout.session.completed event
 * Creates or updates user subscription after successful checkout
 */
export async function processCheckoutCompleted(
	session: Stripe.Checkout.Session,
): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { users } = await import("@/lib/server/payment/schemas/drizzle.schema");

	if (!session?.metadata?.userId) {
		throw new Error("Missing userId in session metadata");
	}

	if (!session.subscription) {
		throw new Error("No subscription in session");
	}

	const subscriptionResponse = await stripe.subscriptions.retrieve(
		session.subscription as string,
		{ expand: ["items.data.price"] },
	);

	const subscription = subscriptionResponse as Stripe.Subscription;

	const priceId =
		typeof subscription.items.data[0]?.price === "string"
			? subscription.items.data[0].price
			: subscription.items.data[0]?.price?.id;

	if (!priceId) {
		throw new Error("No price ID found in subscription");
	}

	const planType = getPlanTypeFromPriceId(priceId);

	await db
		.update(users)
		.set({
			stripeSubscriptionId: subscription.id,
			stripeCustomerId:
				typeof subscription.customer === "string"
					? subscription.customer
					: subscription.customer?.id,
			stripePriceId: priceId,
			stripeCurrentPeriodEnd: subscription.current_period_end
				? new Date(subscription.current_period_end * 1000)
				: null,
			planType: planType as PlanType,
		})
		.where(eq(users.id, session.metadata.userId));
}

/**
 * Process invoice.payment_succeeded event
 * Updates subscription period end after successful renewal
 */
export async function processInvoicePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { users } = await import("@/lib/server/payment/schemas/drizzle.schema");

	const subscriptionId =
		typeof invoice.subscription === "string"
			? invoice.subscription
			: invoice.subscription?.id;

	if (!subscriptionId) {
		throw new Error("No subscription in invoice");
	}

	const subscriptionResponse = await stripe.subscriptions.retrieve(
		subscriptionId,
		{ expand: ["items.data.price"] },
	);

	const subscription = subscriptionResponse as Stripe.Subscription;

	const priceId =
		typeof subscription.items.data[0]?.price === "string"
			? subscription.items.data[0].price
			: subscription.items.data[0]?.price?.id;

	if (!priceId) {
		throw new Error("No price ID found in subscription");
	}

	const planType = getPlanTypeFromPriceId(priceId);

	await db
		.update(users)
		.set({
			stripePriceId: priceId,
			stripeCurrentPeriodEnd: subscription.current_period_end
				? new Date(subscription.current_period_end * 1000)
				: null,
			planType: planType as PlanType,
		})
		.where(eq(users.stripeSubscriptionId, subscription.id));
}

/**
 * Process customer.subscription.updated event
 * Updates subscription details when changed (plan upgrade/downgrade)
 */
export async function processSubscriptionUpdated(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { users } = await import("@/lib/server/payment/schemas/drizzle.schema");

	const priceItem = subscription.items.data[0];
	const priceId =
		typeof priceItem?.price === "string"
			? priceItem.price
			: priceItem?.price?.id;

	if (!priceId) {
		throw new Error("No price ID found in subscription update");
	}

	const planType = getPlanTypeFromPriceId(priceId);

	await db
		.update(users)
		.set({
			stripePriceId: priceId,
			stripeCurrentPeriodEnd: subscription.current_period_end
				? new Date(subscription.current_period_end * 1000)
				: null,
			planType: planType as PlanType,
		})
		.where(eq(users.stripeSubscriptionId, subscription.id));
}

/**
 * Process customer.subscription.deleted event
 * Downgrades user to FREE plan when subscription is cancelled
 */
export async function processSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { users } = await import("@/lib/server/payment/schemas/drizzle.schema");

	await db
		.update(users)
		.set({
			stripeSubscriptionId: null,
			stripePriceId: null,
			stripeCurrentPeriodEnd: null,
			planType: "FREE",
		})
		.where(eq(users.stripeSubscriptionId, subscription.id));
}

/**
 * Mark a webhook event as processed (idempotency)
 */
export async function markEventProcessed(eventId: string): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { stripeWebhookEvents } = await import(
		"@/lib/server/payment/schemas/drizzle.schema"
	);

	await db
		.update(stripeWebhookEvents)
		.set({ processed: true })
		.where(eq(stripeWebhookEvents.stripeEventId, eventId));
}

/**
 * Check if a webhook event has already been processed (idempotency check)
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
	const { db } = await import("@/lib/server/db");
	const { stripeWebhookEvents } = await import(
		"@/lib/server/payment/schemas/drizzle.schema"
	);

	const [existingEvent] = await db
		.select()
		.from(stripeWebhookEvents)
		.where(eq(stripeWebhookEvents.stripeEventId, eventId));

	return existingEvent?.processed || false;
}

/**
 * Create or update webhook event record
 */
export async function upsertWebhookEvent(
	eventId: string,
	eventType: string,
): Promise<void> {
	const { db } = await import("@/lib/server/db");
	const { stripeWebhookEvents } = await import(
		"@/lib/server/payment/schemas/drizzle.schema"
	);

	// Check if exists
	const [existing] = await db
		.select()
		.from(stripeWebhookEvents)
		.where(eq(stripeWebhookEvents.stripeEventId, eventId));

	if (existing) {
		// Update
		await db
			.update(stripeWebhookEvents)
			.set({ type: eventType })
			.where(eq(stripeWebhookEvents.stripeEventId, eventId));
	} else {
		// Insert
		await db.insert(stripeWebhookEvents).values({
			stripeEventId: eventId,
			type: eventType,
			processed: false,
		});
	}
}
