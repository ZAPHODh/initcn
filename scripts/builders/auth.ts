/**
 * Authentication infrastructure builder
 * Handles all auth-* registry items
 */

import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class AuthBuilder extends BaseInfraBuilder {
	canHandle(registryName: string, config?: ConfigJson): boolean {
		// If this is a Vite project, let ViteBuilder handle it
		if (config?.capabilities?.framework?.includes("vite")) {
			return false;
		}

		// If this is a TanStack Start project, let TanStackStartBuilder handle it
		if (config?.capabilities?.framework?.includes("tanstack-start")) {
			return false;
		}

		return (
			registryName.startsWith("auth-") ||
			registryName === "auth" ||
			registryName.startsWith("otp")
		);
	}

	getFeatureName(): string {
		return "auth";
	}

	// Auth-specific overrides can be added here if needed
	// The base class handles all the default mappings
}
