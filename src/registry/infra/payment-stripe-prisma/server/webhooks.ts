/**
 * Webhook Event Processing Utilities
 * Helper functions for processing Stripe webhook events with Prisma
 */

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
	const { prisma } = await import("@/lib/server/db");

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

	await prisma.user.update({
		where: { id: session.metadata.userId },
		data: {
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
		},
	});
}

/**
 * Process invoice.payment_succeeded event
 * Updates subscription period end after successful renewal
 */
export async function processInvoicePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<void> {
	const { prisma } = await import("@/lib/server/db");

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

	await prisma.user.update({
		where: { stripeSubscriptionId: subscription.id },
		data: {
			stripePriceId: priceId,
			stripeCurrentPeriodEnd: subscription.current_period_end
				? new Date(subscription.current_period_end * 1000)
				: null,
			planType: planType as PlanType,
		},
	});
}

/**
 * Process customer.subscription.updated event
 * Updates subscription details when changed (plan upgrade/downgrade)
 */
export async function processSubscriptionUpdated(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { prisma } = await import("@/lib/server/db");

	const priceItem = subscription.items.data[0];
	const priceId =
		typeof priceItem?.price === "string"
			? priceItem.price
			: priceItem?.price?.id;

	if (!priceId) {
		throw new Error("No price ID found in subscription update");
	}

	const planType = getPlanTypeFromPriceId(priceId);

	await prisma.user.update({
		where: { stripeSubscriptionId: subscription.id },
		data: {
			stripePriceId: priceId,
			stripeCurrentPeriodEnd: subscription.current_period_end
				? new Date(subscription.current_period_end * 1000)
				: null,
			planType: planType as PlanType,
		},
	});
}

/**
 * Process customer.subscription.deleted event
 * Downgrades user to FREE plan when subscription is cancelled
 */
export async function processSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { prisma } = await import("@/lib/server/db");

	await prisma.user.update({
		where: { stripeSubscriptionId: subscription.id },
		data: {
			stripeSubscriptionId: null,
			stripePriceId: null,
			stripeCurrentPeriodEnd: null,
			planType: "FREE",
		},
	});
}

/**
 * Mark a webhook event as processed (idempotency)
 */
export async function markEventProcessed(eventId: string): Promise<void> {
	const { prisma } = await import("@/lib/server/db");

	await prisma.stripeWebhookEvent.update({
		where: { stripeEventId: eventId },
		data: { processed: true },
	});
}

/**
 * Check if a webhook event has already been processed (idempotency check)
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
	const { prisma } = await import("@/lib/server/db");

	const existingEvent = await prisma.stripeWebhookEvent.findUnique({
		where: { stripeEventId: eventId },
	});

	return existingEvent?.processed || false;
}

/**
 * Create or update webhook event record
 */
export async function upsertWebhookEvent(
	eventId: string,
	eventType: string,
): Promise<void> {
	const { prisma } = await import("@/lib/server/db");

	await prisma.stripeWebhookEvent.upsert({
		where: { stripeEventId: eventId },
		create: {
			stripeEventId: eventId,
			type: eventType,
			processed: false,
		},
		update: {
			type: eventType,
		},
	});
}
