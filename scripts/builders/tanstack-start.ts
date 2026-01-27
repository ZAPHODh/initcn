/**
 * TanStack Start builder for TanStack Start + Vite infrastructure configurations
 *
 * Handles file mapping for TanStack Start projects with unified routing:
 * - src/routes/ for both UI and API routes
 * - src/lib/client/ for client utilities
 * - src/lib/server/ for server utilities
 * - Built-in server runtime (Nitro)
 */

import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class TanStackStartBuilder extends BaseInfraBuilder {
	protected defaultTargetMappings: Record<string, string> = {
		// Environment files (root)
		".env.example.*": ".env.example",

		// API endpoints → unified src/routes/api/
		"api/*": "src/routes/api/*",

		// Routes (TanStack Router routes)
		"routes/*": "src/routes/*",

		// Components
		"components/*": "src/components/*.tsx",

		// Client utilities
		"client/*": "src/lib/client/*",

		// Server utilities
		"server/*": "src/lib/server/{feature}/*",

		// Emails
		"emails/*": "src/emails/*",

		// Schemas - Prisma goes to root, Drizzle goes to src/db/schema/
		"schemas/prisma.schema": "prisma/schema.prisma",
		"schemas/drizzle.schema.ts": "src/db/schema/{feature}.ts",

		// Shared utilities (db, mail, rate-limit - go to lib/server/)
		"db.ts": "src/lib/server/db.ts",
		"mail.ts": "src/lib/server/mail.ts",
		"rate-limit.ts": "src/lib/server/rate-limit.ts",

		// Everything else goes to feature-specific lib
		"*": "src/lib/server/{feature}/*",
	};

	/**
	 * Check if this builder can handle the given registry name
	 *
	 * Handles configs with framework capability set to "tanstack-start"
	 */
	canHandle(registryName: string, config?: ConfigJson): boolean {
		// Check if config specifies tanstack-start framework
		if (config?.capabilities?.framework) {
			return config.capabilities.framework.includes("tanstack-start");
		}

		// Fallback: check naming convention
		return registryName.includes("-tanstack-");
	}

	/**
	 * Get feature name from registry name
	 *
	 * Examples:
	 * - "otp-tanstack-shared" -> "auth"
	 * - "otp-tanstack-prisma" -> "auth"
	 * - "payment-stripe-tanstack-prisma" -> "payment"
	 */
	getFeatureName(): string {
		return "auth"; // For now, hardcode to auth
		// TODO: Make this dynamic based on config or naming
	}

	/**
	 * Override getTargetPath to handle TanStack Start-specific path resolution
	 */
	getTargetPath(
		filePath: string,
		sourceDir: string,
		registryName: string,
		config?: ConfigJson,
	): string {
		// Use the base implementation
		const targetPath = super.getTargetPath(
			filePath,
			sourceDir,
			registryName,
			config,
		);

		// Additional TanStack Start-specific transformations if needed
		return targetPath;
	}
}
