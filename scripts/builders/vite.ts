/**
 * Vite builder for TanStack Router + Vite infrastructure configurations
 *
 * Handles file mapping for Vite projects with different conventions:
 * - src/ prefix for all source files
 * - server/api/ instead of app/api/
 * - Different schema locations (prisma/ vs src/db/schema/)
 */

import { relative } from "node:path";
import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class ViteBuilder extends BaseInfraBuilder {
	protected defaultTargetMappings: Record<string, string> = {
		// Environment files (root)
		".env.example.*": ".env.example",

		// Vite config extension (root)
		"vite.config.ts": "vite.config.auth.ts",

		// API endpoints (backend framework-agnostic)
		"api/*": "server/api/*",

		// Routes (TanStack Router convention)
		"routes/*": "src/routes/*",

		// Components
		"components/*": "src/components/*",

		// Client utilities (React Query, hooks)
		"client/*": "src/lib/client/*",

		// Server utilities (JWT, validation, etc.)
		"server/*": "src/lib/server/{feature}/*",

		// Constants
		"constants/*": "src/lib/constants/*",

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
	 * Handles configs with framework capability set to "vite"
	 */
	canHandle(registryName: string, config?: ConfigJson): boolean {
		// Check if config specifies vite framework
		if (config?.capabilities?.framework) {
			return config.capabilities.framework.includes("vite");
		}

		// Fallback: check naming convention
		return registryName.includes("-vite-");
	}

	/**
	 * Get feature name from registry name
	 *
	 * Examples:
	 * - "otp-vite-shared" -> "auth"
	 * - "otp-vite-prisma" -> "auth"
	 * - "payment-stripe-vite-prisma" -> "payment"
	 */
	getFeatureName(): string {
		return "auth"; // For now, hardcode to auth
		// TODO: Make this dynamic based on config or naming
	}

	/**
	 * Override getTargetPath to handle Vite-specific path resolution
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

		// Additional Vite-specific transformations if needed
		return targetPath;
	}
}
