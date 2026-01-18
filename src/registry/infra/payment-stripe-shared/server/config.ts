/**
 * Plan Configuration and Limits
 * Define feature flags and limits for each subscription tier
 */

import type { PlanType, SubscriptionPlan } from "../types";

/**
 * Plan limits interface
 * Customize these fields based on your application's needs
 * -1 indicates unlimited, null indicates not applicable
 */
export interface PlanLimits {
	maxProjects: number;
	maxTeamMembers: number;
	maxStorageGB: number;
	maxAPICallsPerMonth: number;
	hasExports: boolean;
	hasAdvancedAnalytics: boolean;
	hasPrioritySupport: boolean;
	hasCustomBranding: boolean;
	hasAPIAccess: boolean;
	hasWebhooks: boolean;
}

/**
 * Plan limits configuration
 * Modify these values to match your application's pricing tiers
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
	FREE: {
		maxProjects: 2,
		maxTeamMembers: 1,
		maxStorageGB: 1,
		maxAPICallsPerMonth: 1000,
		hasExports: false,
		hasAdvancedAnalytics: false,
		hasPrioritySupport: false,
		hasCustomBranding: false,
		hasAPIAccess: false,
		hasWebhooks: false,
	},
	SIMPLE: {
		maxProjects: 10,
		maxTeamMembers: 5,
		maxStorageGB: 10,
		maxAPICallsPerMonth: 10000,
		hasExports: true,
		hasAdvancedAnalytics: true,
		hasPrioritySupport: false,
		hasCustomBranding: false,
		hasAPIAccess: true,
		hasWebhooks: false,
	},
	PRO: {
		maxProjects: -1, // unlimited
		maxTeamMembers: -1, // unlimited
		maxStorageGB: 100,
		maxAPICallsPerMonth: -1, // unlimited
		hasExports: true,
		hasAdvancedAnalytics: true,
		hasPrioritySupport: true,
		hasCustomBranding: true,
		hasAPIAccess: true,
		hasWebhooks: true,
	},
};

/**
 * Check if a limit value indicates unlimited
 */
export function isUnlimited(value: number): boolean {
	return value === -1;
}

/**
 * Subscription plan definitions
 */
export const freePlan: SubscriptionPlan = {
	name: "Free",
	description: "Perfect for getting started",
	stripePriceId: "",
};

export const simplePlan: SubscriptionPlan = {
	name: "Simple",
	description: "For growing teams and projects",
	stripePriceId:
		process.env.STRIPE_SIMPLE_PLAN_ID ||
		(process.env.STRIPE_SIMPLE_BRL_MONTHLY_ID as string),
};

export const proPlan: SubscriptionPlan = {
	name: "PRO",
	description: "For professional teams that need everything",
	stripePriceId:
		process.env.STRIPE_PRO_PLAN_ID ||
		(process.env.STRIPE_PRO_BRL_MONTHLY_ID as string),
};
