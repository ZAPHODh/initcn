import { eq } from "drizzle-orm";
import type { UserSubscriptionPlan, PlanLimits } from "payment-stripe-shared";
import {
	freePlan,
	proPlan,
	simplePlan,
	PLAN_LIMITS,
	getPlanTypeFromPriceId,
} from "payment-stripe-shared";
import { users } from "@/lib/server/payment/schemas/drizzle.schema";

export async function getUserSubscriptionPlan(
	userId: string,
): Promise<UserSubscriptionPlan> {
	const { db } = await import("@/lib/server/db");

	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: {
			stripeSubscriptionId: true,
			stripeCurrentPeriodEnd: true,
			stripeCustomerId: true,
			stripePriceId: true,
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	const isActive = Boolean(
		user.stripePriceId &&
			user.stripeCurrentPeriodEnd &&
			user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now(),
	);

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

export function getPlanLimits(planName: string): PlanLimits {
	const normalized = planName.toUpperCase();
	return (
		PLAN_LIMITS[normalized as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE
	);
}
