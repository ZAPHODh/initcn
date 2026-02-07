/**
 * Base class for all infrastructure builders
 * Provides shared file mapping logic and utilities
 */

import { relative } from "node:path";
import type { ConfigJson, InfraBuilder } from "./shared.js";

export abstract class BaseInfraBuilder implements InfraBuilder {
	/**
	 * Default file mapping rules (can be overridden by subclasses)
	 * Pattern syntax:
	 * - "api/*" matches all files in api/ directory
	 * - "middleware.ts" matches exact file
	 * - "*" matches everything else (fallback)
	 *
	 * Placeholder syntax in targets:
	 * - {feature} replaced with getFeatureName() result
	 * - * replaced with the matched portion after pattern prefix
	 */
	protected defaultTargetMappings: Record<string, string> = {
		// Environment files (root)
		".env.example.*": ".env.example.*",

		// API routes
		"api/*": "app/api/*",

		// App pages
		"app/*": "app/*",

		// Components (preserve source extension)
		"components/*": "components/*",

		// Actions
		"actions/*": "app/actions/*",

		// Server utilities
		"server/*": "lib/server/{feature}/*",

		// Client utilities
		"client/*": "lib/client/*",

		// Emails
		"emails/*": "emails/*",

		// Locales
		"locales/*": "locales/*",

		// Middleware (root)
		"middleware.ts": "middleware.ts",

		// Shared utilities (db, mail - go to lib/server/ instead of feature-specific)
		"db.ts": "lib/server/db.ts",
		"mail.ts": "lib/server/mail.ts",

		// Everything else goes to feature-specific lib
		"*": "lib/server/{feature}/*",
	};

	/**
	 * Checks if this builder can handle the given registry name
	 */
	abstract canHandle(registryName: string, config?: ConfigJson): boolean;

	/**
	 * Returns the feature name for this builder (e.g., "auth", "payment", "i18n")
	 */
	abstract getFeatureName(): string;

	/**
	 * Get target path for a source file using pattern matching
	 */
	getTargetPath(
		filePath: string,
		sourceDir: string,
		registryName: string,
		config?: ConfigJson,
	): string {
		const relativePath = relative(sourceDir, filePath);
		const featureName = this.getFeatureName();

		// Check config.json for custom mappings (framework-specific)
		const framework = this.detectFramework(config);
		const customMappings = config?.targetMappings?.[framework];
		const mappings = customMappings || this.defaultTargetMappings;

		// Apply pattern matching
		for (const [pattern, target] of Object.entries(mappings)) {
			if (this.matchesPattern(relativePath, pattern)) {
				return this.applyMapping(relativePath, pattern, target, featureName);
			}
		}

		// Fallback (should never reach here if "*" pattern exists)
		return `lib/server/${featureName}/${relativePath}`;
	}

	/**
	 * Pattern matching with glob support
	 */
	private matchesPattern(path: string, pattern: string): boolean {
		// Normalize path separators to forward slashes (Windows compatibility)
		const normalizedPath = path.replace(/\\/g, "/");

		// Exact match
		if (normalizedPath === pattern) {
			return true;
		}

		// Wildcard pattern (e.g., "api/*")
		if (pattern.endsWith("/*")) {
			const prefix = pattern.slice(0, -2);
			return normalizedPath.startsWith(prefix + "/");
		}

		// Wildcard pattern for extensions (e.g., ".env.example.*")
		if (pattern.includes("*")) {
			const regexPattern = pattern
				.replace(/\./g, "\\.")
				.replace(/\*/g, ".*");
			return new RegExp(`^${regexPattern}$`).test(normalizedPath);
		}

		// Catch-all pattern
		if (pattern === "*") {
			return true;
		}

		return false;
	}

	/**
	 * Apply mapping with variable substitution
	 */
	private applyMapping(
		sourcePath: string,
		pattern: string,
		target: string,
		featureName: string,
	): string {
		// Normalize path separators to forward slashes (Windows compatibility)
		const normalizedPath = sourcePath.replace(/\\/g, "/");
		let result = target;

		// Replace {feature} placeholder
		result = result.replace(/\{feature\}/g, featureName);

		// Handle glob patterns (e.g., "api/*" → "app/api/*")
		if (pattern.endsWith("/*") && target.includes("*")) {
			const prefix = pattern.slice(0, -2);
			const suffix = normalizedPath.slice(prefix.length + 1);
			result = result.replace("*", suffix);
		}

		// Handle filename extraction for flattened components
		// Pattern: "components/*" → "components/*.tsx"
		if (target.includes("*.")) {
			const filename = sourcePath.split("/").pop();
			if (filename) {
				// Extract base name without extension
				const baseName = filename.replace(/\.[^.]+$/, "");
				// Extract extension from target pattern (e.g., ".tsx" from "components/*.tsx")
				const targetExt = target.match(/\*(\.[^/]+)$/)?.[1] || "";
				// Replace the wildcard pattern with basename + target extension
				result = result.replace(/\*\.[^/]+$/, baseName + targetExt);
			}
		}

		// Handle wildcard extension patterns (e.g., ".env.example.*")
		if (pattern.includes("*") && !pattern.endsWith("/*") && target.includes("*")) {
			result = sourcePath;
		}

		return result;
	}

	/**
	 * Detect framework from config capabilities
	 */
	private detectFramework(config?: ConfigJson): string {
		const frameworks = config?.capabilities?.framework || ["nextjs"];
		return frameworks[0] === "*" ? "nextjs" : frameworks[0];
	}

	/**
	 * Get all compatible ORMs for this config
	 */
	getSupportedOrms(config: ConfigJson): string[] {
		return config.capabilities?.orm || ["*"];
	}

	/**
	 * Get all compatible frameworks for this config
	 */
	getSupportedFrameworks(config: ConfigJson): string[] {
		return config.capabilities?.framework || ["*"];
	}
}
