/**
 * Authentication infrastructure builder
 * Handles all auth-* registry items
 */

import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class AuthBuilder extends BaseInfraBuilder {
	canHandle(registryName: string, _config?: ConfigJson): boolean {
		return (
			registryName.startsWith("auth-") ||
			registryName === "auth" ||
			registryName === "otp" ||
			registryName === "otp-shared"
		);
	}

	getFeatureName(): string {
		return "auth";
	}

	// Auth-specific overrides can be added here if needed
	// The base class handles all the default mappings
}
