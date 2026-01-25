/**
 * Payment infrastructure builder
 * Handles all payment-* registry items (Stripe subscriptions, billing, etc.)
 */

import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class PaymentBuilder extends BaseInfraBuilder {
	canHandle(registryName: string, _config?: ConfigJson): boolean {
		return (
			registryName.startsWith("payment-") ||
			registryName === "payment" ||
			registryName === "subscription" ||
			registryName === "subscription-shared"
		);
	}

	getFeatureName(): string {
		return "payment";
	}

	// Payment-specific overrides can be added here if needed
	// The base class handles all the default mappings
}
