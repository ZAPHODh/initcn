/**
 * Payment Stripe Prisma
 * Public API exports for Stripe subscription management with Prisma ORM
 */

// Re-export shared types
export type {
	Currency,
	Locale,
	PlanType,
	BillingInterval,
	SubscriptionPlan,
	UserSubscriptionPlan,
	CreateCheckoutRequest,
	CreateCheckoutResponse,
	ManageBillingResponse,
} from "payment-stripe-shared";

// Stripe client
export { stripe } from "./db";

// Subscription management
export {
	getUserSubscriptionPlan,
	getPlanLimits,
} from "./server/subscription";

// Webhook event processing
export {
	processCheckoutCompleted,
	processInvoicePaymentSucceeded,
	processSubscriptionUpdated,
	processSubscriptionDeleted,
	isEventProcessed,
	upsertWebhookEvent,
	markEventProcessed,
} from "./server/webhooks";

// Server actions
export { createCheckout } from "./actions/create-checkout";
export { manageBilling } from "./actions/manage-billing";
