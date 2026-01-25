/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Processes Stripe webhook events
 */

import { type NextRequest } from "next/server";
import { buffer } from "node:stream/consumers";
import { stripe } from "@/lib/server/payment/db";
import {
	processCheckoutCompleted,
	processInvoicePaymentSucceeded,
	processSubscriptionUpdated,
	processSubscriptionDeleted,
	isEventProcessed,
	upsertWebhookEvent,
	markEventProcessed,
} from "@/lib/server/payment/webhooks";

export async function POST(req: NextRequest) {
	// Get raw body for signature verification
	const body = await buffer(req.body as unknown as NodeJS.ReadableStream);
	const signature = req.headers.get("Stripe-Signature");

	if (!signature) {
		return new Response("No signature", { status: 400 });
	}

	// Verify webhook signature
	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET as string,
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Webhook signature verification failed:", errorMessage);
		return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
	}

	console.log(`Processing webhook: ${event.id} - ${event.type}`);

	// Check if event was already processed (idempotency)
	const alreadyProcessed = await isEventProcessed(event.id);
	if (alreadyProcessed) {
		console.log(`Event ${event.id} already processed, skipping`);
		return new Response(null, { status: 200 });
	}

	// Create or update webhook event record
	await upsertWebhookEvent(event.id, event.type);

	// Process event based on type
	try {
		switch (event.type) {
			case "checkout.session.completed":
			case "checkout.session.async_payment_succeeded": {
				const session = event.data.object as Stripe.Checkout.Session;
				await processCheckoutCompleted(session);
				console.log(
					`Checkout completed for user: ${session.metadata?.userId}`,
				);
				break;
			}

			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Stripe.Invoice;
				await processInvoicePaymentSucceeded(invoice);
				console.log(`Invoice payment succeeded: ${invoice.id}`);
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				await processSubscriptionUpdated(subscription);
				console.log(`Subscription updated: ${subscription.id}`);
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				await processSubscriptionDeleted(subscription);
				console.log(
					`Subscription cancelled, user downgraded to FREE: ${subscription.id}`,
				);
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		// Mark event as processed
		await markEventProcessed(event.id);

		return new Response(null, { status: 200 });
	} catch (error) {
		console.error(`Failed to process event ${event.id}:`, error);
		return new Response("Event processing failed", { status: 500 });
	}
}
