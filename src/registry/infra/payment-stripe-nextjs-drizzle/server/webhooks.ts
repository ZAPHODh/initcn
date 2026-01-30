import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { PlanType } from "payment-stripe-shared";
import { getPlanTypeFromPriceId } from "payment-stripe-shared";
import { stripe } from "@/lib/server/payment/db";
import { stripeWebhookEvents, users } from "@/lib/server/payment/schemas/drizzle.schema";

export async function processCheckoutCompleted(
	session: Stripe.Checkout.Session,
): Promise<void> {
	const { db } = await import("@/lib/server/db");

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

export async function processInvoicePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<void> {
	const { db } = await import("@/lib/server/db");

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

export async function processSubscriptionUpdated(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { db } = await import("@/lib/server/db");

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

export async function processSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<void> {
	const { db } = await import("@/lib/server/db");

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

export async function markEventProcessed(eventId: string): Promise<void> {
	const { db } = await import("@/lib/server/db");

	await db
		.update(stripeWebhookEvents)
		.set({ processed: true })
		.where(eq(stripeWebhookEvents.stripeEventId, eventId));
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
	const { db } = await import("@/lib/server/db");

	const existingEvent = await db.query.stripeWebhookEvents.findFirst({
		where: eq(stripeWebhookEvents.stripeEventId, eventId),
	});

	return existingEvent?.processed || false;
}

export async function upsertWebhookEvent(
	eventId: string,
	eventType: string,
): Promise<void> {
	const { db } = await import("@/lib/server/db");

	await db
		.insert(stripeWebhookEvents)
		.values({
			stripeEventId: eventId,
			type: eventType,
			processed: false,
		})
		.onConflictDoUpdate({
			target: stripeWebhookEvents.stripeEventId,
			set: {
				type: eventType,
			},
		});
}
