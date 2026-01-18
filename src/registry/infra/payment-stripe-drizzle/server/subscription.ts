/**
 * Subscription Management (Drizzle)
 * Functions for querying and managing user subscription status
 */

import { eq } from "drizzle-orm";
import type { UserSubscriptionPlan, PlanType } from "payment-stripe-shared";
import {
	freePlan,
	proPlan,
	simplePlan,
	PLAN_LIMITS,
	type PlanLimits,
	getPlanTypeFromPriceId,
} from "payment-stripe-shared";

/**
 * Get user's subscription plan with status
 * Requires db and users table to be provided by the user
 */
export async function getUserSubscriptionPlan(
	userId: string,
): Promise<UserSubscriptionPlan> {
	// User must provide their db and schema
	const { db } = await import("@/lib/server/db");
	const { users } = await import("@/lib/server/payment/schemas/drizzle.schema");

	const [user] = await db.select().from(users).where(eq(users.id, userId));

	if (!user) {
		throw new Error("User not found");
	}

	// Check if subscription is active (with 1-day grace period)
	const isActive = Boolean(
		user.stripePriceId &&
			user.stripeCurrentPeriodEnd &&
			user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now(),
	);

	// Determine plan based on active subscription
	let plan = freePlan;
	if (isActive && user.stripePriceId) {
		const planType = getPlanTypeFromPriceId(user.stripePriceId);

		if (planType === "PRO") {
			plan = proPlan;
		} else if (planType === "SIMPLE") {
			plan = simplePlan;
		}
	}

	const isPro = plan.name === "PRO";

	return {
		...plan,
		stripeCustomerId: user.stripeCustomerId,
		stripeSubscriptionId: user.stripeSubscriptionId,
		stripePriceId: user.stripePriceId || "",
		stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime() || null,
		isPro,
		isActive,
	};
}

/**
 * Get plan limits for a given plan type
 */
export function getPlanLimits(planName: string): PlanLimits {
	const normalized = planName.toUpperCase() as PlanType;
	return PLAN_LIMITS[normalized] || PLAN_LIMITS.FREE;
}
