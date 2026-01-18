"use server";

/**
 * Create Checkout Server Action
 * Creates a Stripe checkout session for subscription
 */

import { actionClient, createCheckoutSchema } from "payment-stripe-shared";
import { getStripePriceId, getCurrencyFromLocale } from "payment-stripe-shared";
import { stripe } from "@/lib/server/payment/db";

export const createCheckout = actionClient
	.schema(createCheckoutSchema)
	.action(async ({ parsedInput: { plan, interval, locale } }) => {
		// User must provide getCurrentSession from auth
		const { getCurrentSession } = await import("@/lib/server/auth/session");
		const { user } = await getCurrentSession();

		if (!user) {
			throw new Error("Unauthorized");
		}

		// Map locale to currency
		const currency = getCurrencyFromLocale(locale || "en");

		// Get Stripe price ID from environment variables
		const stripePriceId = getStripePriceId(plan, currency, interval);

		const billingUrl = process.env.NEXT_PUBLIC_APP_URL + "/dashboard/billing";

		// Create Stripe checkout session
		const session = await stripe.checkout.sessions.create({
			success_url: billingUrl,
			cancel_url: billingUrl,
			payment_method_types: ["card"],
			mode: "subscription",
			customer_email: user.email!,
			line_items: [{ price: stripePriceId, quantity: 1 }],
			metadata: {
				userId: user.id,
			},
		});

		return { url: session.url };
	});
