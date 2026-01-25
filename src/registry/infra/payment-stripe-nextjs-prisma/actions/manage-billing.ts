"use server";

/**
 * Manage Billing Server Action
 * Redirects user to Stripe billing portal
 */

import { actionClient } from "payment-stripe-shared";
import { stripe } from "@/lib/server/payment/db";
import { getUserSubscriptionPlan } from "@/lib/server/payment/subscription";

export const manageBilling = actionClient.action(async () => {
	// User must provide getCurrentSession from auth
	const { getCurrentSession } = await import("@/lib/server/auth/session");
	const { user } = await getCurrentSession();

	if (!user) {
		throw new Error("Unauthorized");
	}

	// Get user's subscription plan
	const subscriptionPlan = await getUserSubscriptionPlan(user.id);

	if (!subscriptionPlan.stripeCustomerId) {
		throw new Error("No Stripe customer ID found");
	}

	const billingUrl = process.env.NEXT_PUBLIC_APP_URL + "/dashboard/billing";

	// Create billing portal session
	const billingPortal = await stripe.billingPortal.sessions.create({
		customer: subscriptionPlan.stripeCustomerId,
		return_url: billingUrl,
	});

	return { url: billingPortal.url };
});
