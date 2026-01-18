/**
 * Multi-Currency Pricing Utilities
 * Handles pricing configuration for different currencies and locales
 */

import type { Currency, Locale, PlanPricing, PricingInfo, PlanType } from "../types";

const PRICING_CONFIG: Record<Currency, PlanPricing> = {
	BRL: {
		simple: {
			currency: "BRL",
			currencySymbol: "R$",
			monthlyPrice: 8,
			yearlyPrice: 79.68,
			monthlyPriceFormatted: "R$8",
			yearlyPriceFormatted: "R$79.68",
		},
		pro: {
			currency: "BRL",
			currencySymbol: "R$",
			monthlyPrice: 15,
			yearlyPrice: 149.40,
			monthlyPriceFormatted: "R$15",
			yearlyPriceFormatted: "R$149.40",
		},
	},
	USD: {
		simple: {
			currency: "USD",
			currencySymbol: "$",
			monthlyPrice: 8,
			yearlyPrice: 79.68,
			monthlyPriceFormatted: "$8",
			yearlyPriceFormatted: "$79.68",
		},
		pro: {
			currency: "USD",
			currencySymbol: "$",
			monthlyPrice: 15,
			yearlyPrice: 149.40,
			monthlyPriceFormatted: "$15",
			yearlyPriceFormatted: "$149.40",
		},
	},
	EUR: {
		simple: {
			currency: "EUR",
			currencySymbol: "€",
			monthlyPrice: 7,
			yearlyPrice: 69.72,
			monthlyPriceFormatted: "€7",
			yearlyPriceFormatted: "€69.72",
		},
		pro: {
			currency: "EUR",
			currencySymbol: "€",
			monthlyPrice: 14,
			yearlyPrice: 139.44,
			monthlyPriceFormatted: "€14",
			yearlyPriceFormatted: "€139.44",
		},
	},
};

/**
 * Maps a locale code to the appropriate currency
 * pt → BRL, European locales → EUR, default → USD
 */
export function getCurrencyFromLocale(locale: string): Currency {
	if (locale === "pt") return "BRL";
	if (["es", "fr", "de", "it"].includes(locale)) return "EUR";
	return "USD";
}

/**
 * Gets pricing information for all plans in the given locale
 */
export function getPricingForLocale(locale: string): PlanPricing {
	const currency = getCurrencyFromLocale(locale);
	return PRICING_CONFIG[currency];
}

/**
 * Gets pricing information for a specific plan in the given locale
 */
export function getPricingForPlan(
	locale: string,
	planType: "simple" | "pro"
): PricingInfo {
	const pricing = getPricingForLocale(locale);
	return pricing[planType];
}

/**
 * Formats a price amount with the appropriate currency symbol
 */
export function formatPrice(amount: number, currency: Currency): string {
	const symbol = PRICING_CONFIG[currency].simple.currencySymbol;
	return `${symbol}${amount}`;
}

/**
 * Retrieves the Stripe price ID from environment variables
 * based on plan type, currency, and billing interval
 */
export function getStripePriceId(
	planType: "simple" | "pro",
	currency: Currency,
	interval: "monthly" | "yearly"
): string {
	const envKey = `STRIPE_${planType.toUpperCase()}_${currency}_${interval.toUpperCase()}_ID`;

	switch (envKey) {
		case "STRIPE_SIMPLE_BRL_MONTHLY_ID":
			return process.env.STRIPE_SIMPLE_BRL_MONTHLY_ID as string;
		case "STRIPE_SIMPLE_BRL_YEARLY_ID":
			return process.env.STRIPE_SIMPLE_BRL_YEARLY_ID as string;
		case "STRIPE_SIMPLE_USD_MONTHLY_ID":
			return process.env.STRIPE_SIMPLE_USD_MONTHLY_ID as string;
		case "STRIPE_SIMPLE_USD_YEARLY_ID":
			return process.env.STRIPE_SIMPLE_USD_YEARLY_ID as string;
		case "STRIPE_SIMPLE_EUR_MONTHLY_ID":
			return process.env.STRIPE_SIMPLE_EUR_MONTHLY_ID as string;
		case "STRIPE_SIMPLE_EUR_YEARLY_ID":
			return process.env.STRIPE_SIMPLE_EUR_YEARLY_ID as string;
		case "STRIPE_PRO_BRL_MONTHLY_ID":
			return process.env.STRIPE_PRO_BRL_MONTHLY_ID as string;
		case "STRIPE_PRO_BRL_YEARLY_ID":
			return process.env.STRIPE_PRO_BRL_YEARLY_ID as string;
		case "STRIPE_PRO_USD_MONTHLY_ID":
			return process.env.STRIPE_PRO_USD_MONTHLY_ID as string;
		case "STRIPE_PRO_USD_YEARLY_ID":
			return process.env.STRIPE_PRO_USD_YEARLY_ID as string;
		case "STRIPE_PRO_EUR_MONTHLY_ID":
			return process.env.STRIPE_PRO_EUR_MONTHLY_ID as string;
		case "STRIPE_PRO_EUR_YEARLY_ID":
			return process.env.STRIPE_PRO_EUR_YEARLY_ID as string;
		default:
			throw new Error(`Unknown Stripe price ID key: ${envKey}`);
	}
}

/**
 * Resolves a plan type from a Stripe price ID
 * Used in webhook handlers to determine which plan a subscription belongs to
 */
export function getPlanTypeFromPriceId(priceId: string): PlanType {
	const simpleIds = [
		process.env.STRIPE_SIMPLE_BRL_MONTHLY_ID,
		process.env.STRIPE_SIMPLE_BRL_YEARLY_ID,
		process.env.STRIPE_SIMPLE_USD_MONTHLY_ID,
		process.env.STRIPE_SIMPLE_USD_YEARLY_ID,
		process.env.STRIPE_SIMPLE_EUR_MONTHLY_ID,
		process.env.STRIPE_SIMPLE_EUR_YEARLY_ID,
	];

	const proIds = [
		process.env.STRIPE_PRO_BRL_MONTHLY_ID,
		process.env.STRIPE_PRO_BRL_YEARLY_ID,
		process.env.STRIPE_PRO_USD_MONTHLY_ID,
		process.env.STRIPE_PRO_USD_YEARLY_ID,
		process.env.STRIPE_PRO_EUR_MONTHLY_ID,
		process.env.STRIPE_PRO_EUR_YEARLY_ID,
	];

	if (proIds.includes(priceId)) return "PRO";
	if (simpleIds.includes(priceId)) return "SIMPLE";
	return "FREE";
}
