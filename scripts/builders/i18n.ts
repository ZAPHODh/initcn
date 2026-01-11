/**
 * Internationalization infrastructure builder
 * Handles all i18n-* registry items (i18n, i18n-with-server-actions, etc.)
 */

import { relative } from "node:path";
import type { InfraBuilder } from "./shared.js";

export class I18nBuilder implements InfraBuilder {
	canHandle(registryName: string): boolean {
		return registryName.startsWith("i18n-") || registryName === "i18n";
	}

	getTargetPath(
		filePath: string,
		sourceDir: string,
		registryName: string,
	): string {
		const relativePath = relative(sourceDir, filePath);

		// API routes go to app/api/
		if (relativePath.startsWith("api/")) {
			return `app/${relativePath}`;
		}

		// App pages go to app/
		if (relativePath.startsWith("app/")) {
			return relativePath;
		}

		// Components go to components/ (flattened)
		if (relativePath.startsWith("components/")) {
			const filename = relativePath.split("/").pop();
			return `components/${filename}`;
		}

		// Emails go to emails/
		if (relativePath.startsWith("emails/")) {
			return relativePath;
		}

		// Middleware at root goes to root
		if (relativePath === "middleware.ts") {
			return "middleware.ts";
		}

		// Everything else (locales, server code, client code, types, etc.)
		// goes to lib/server/i18n/
		return `lib/server/i18n/${relativePath}`;
	}
}
