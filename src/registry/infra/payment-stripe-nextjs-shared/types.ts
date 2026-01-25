/**
 * Stripe Subscription Types
 * Database-agnostic type definitions for Stripe subscription management
 */

export type Currency = "BRL" | "USD" | "EUR";
export type Locale = "en" | "pt" | "es" | "fr" | "de" | "it";
export type PlanType = "FREE" | "SIMPLE" | "PRO";
export type BillingInterval = "monthly" | "yearly";

export interface PricingInfo {
	currency: Currency;
	currencySymbol: string;
	monthlyPrice: number;
	yearlyPrice: number;
	monthlyPriceFormatted: string;
	yearlyPriceFormatted: string;
}

export interface PlanPricing {
	simple: PricingInfo;
	pro: PricingInfo;
}

export interface SubscriptionPlan {
	name: string;
	description: string;
	stripePriceId: string;
}

export interface UserSubscriptionPlan extends SubscriptionPlan {
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	stripePriceId: string;
	stripeCurrentPeriodEnd: number | null;
	isPro: boolean;
	isActive: boolean;
}

export interface CreateCheckoutRequest {
	plan: "simple" | "pro";
	interval: BillingInterval;
	locale?: string;
}

export interface CreateCheckoutResponse {
	url: string | null;
}

export interface ManageBillingResponse {
	url: string | null;
}

export interface StripeWebhookEvent {
	id: string;
	stripeEventId: string;
	type: string;
	processed: boolean;
	createdAt: Date;
}
