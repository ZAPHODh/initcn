/**
 * Stripe Checkout & Billing Portal API Route
 * GET /api/stripe - Creates checkout session or redirects to billing portal
 */

import { type NextRequest } from "next/server";
import { stripe } from "@/lib/server/payment/db";
import { getUserSubscriptionPlan } from "@/lib/server/payment/subscription";
import {
	getStripePriceId,
	getCurrencyFromLocale,
} from "payment-stripe-shared";

export async function GET(req: NextRequest) {
	try {
		// Get user session - requires user to provide getCurrentSession from auth
		const { getCurrentSession } = await import("@/lib/server/auth/session");
		const { user, session } = await getCurrentSession();

		if (!session) {
			return new Response("Unauthorized", { status: 401 });
		}

		// Parse query parameters
		const searchParams = req.nextUrl.searchParams;
		const planParam = searchParams.get("plan") || "pro";
		const intervalParam = searchParams.get("interval") || "monthly";

		// Get locale from cookie (supports next-international)
		const locale = req.cookies.get("Next-Locale")?.value || "en";

		// Map locale to currency (pt → BRL, European locales → EUR, default → USD)
		const currency = getCurrencyFromLocale(locale);

		// Check if user already has a subscription
		const subscriptionPlan = await getUserSubscriptionPlan(user.id);

		// If user has an active subscription, redirect to billing portal
		if (subscriptionPlan.isPro && subscriptionPlan.stripeCustomerId) {
			const billingUrl =
				process.env.NEXT_PUBLIC_APP_URL + "/dashboard/billing";

			const stripeSession = await stripe.billingPortal.sessions.create({
				customer: subscriptionPlan.stripeCustomerId,
				return_url: billingUrl,
			});

			return Response.json({ url: stripeSession.url });
		}

		// Create new checkout session
		const planType = planParam === "simple" ? "simple" : "pro";
		const interval = intervalParam === "yearly" ? "yearly" : "monthly";
		const stripePriceId = getStripePriceId(planType, currency, interval);

		const billingUrl = process.env.NEXT_PUBLIC_APP_URL + "/dashboard/billing";

		const stripeSession = await stripe.checkout.sessions.create({
			success_url: billingUrl,
			cancel_url: billingUrl,
			payment_method_types: ["card"],
			mode: "subscription",
			customer_email: user.email!,
			line_items: [
				{
					price: stripePriceId,
					quantity: 1,
				},
			],
			metadata: {
				userId: user.id,
			},
		});

		return new Response(JSON.stringify({ url: stripeSession.url }));
	} catch (error) {
		console.error("Stripe API error:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
}
