/**
 * Payment Stripe Shared
 * Public API exports for database-agnostic Stripe subscription utilities
 */

// Types
export type {
	Currency,
	Locale,
	PlanType,
	BillingInterval,
	PricingInfo,
	PlanPricing,
	SubscriptionPlan,
	UserSubscriptionPlan,
	CreateCheckoutRequest,
	CreateCheckoutResponse,
	ManageBillingResponse,
	StripeWebhookEvent,
} from "./types";

// Pricing utilities
export {
	getCurrencyFromLocale,
	getPricingForLocale,
	getPricingForPlan,
	formatPrice,
	getStripePriceId,
	getPlanTypeFromPriceId,
} from "./server/pricing";

// Plan configuration
export {
	type PlanLimits,
	PLAN_LIMITS,
	isUnlimited,
	freePlan,
	simplePlan,
	proPlan,
} from "./server/config";

// Validation schemas
export { createCheckoutSchema, webhookEventSchema } from "./server/validation";

// Safe action client
export { actionClient } from "./client/safe-action";
