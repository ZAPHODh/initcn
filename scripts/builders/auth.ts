/**
 * Authentication infrastructure builder
 * Handles all auth-* registry items
 */

import { relative } from "node:path";
import type { InfraBuilder } from "./shared.js";

export class AuthBuilder implements InfraBuilder {
	canHandle(registryName: string): boolean {
		return (
			registryName.startsWith("auth-") ||
			registryName === "auth" ||
			registryName === "otp" ||
			registryName === "otp-shared"
		);
	}

	getTargetPath(
		filePath: string,
		sourceDir: string,
		_registryName: string,
	): string {
		const relativePath = relative(sourceDir, filePath);

		// .env.example.* files go to project root (keep the full name)
		if (relativePath.startsWith(".env.example.")) {
			return relativePath;
		}

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

		// Client code goes to lib/client/
		if (relativePath.startsWith("client/")) {
			return `lib/${relativePath}`;
		}

		// Actions go to app/actions/
		if (relativePath.startsWith("actions/")) {
			return `app/${relativePath}`;
		}

		// Server code goes to lib/server/auth/ (without nested server/ directory)
		if (relativePath.startsWith("server/")) {
			const pathWithoutServerPrefix = relativePath.substring("server/".length);
			return `lib/server/auth/${pathWithoutServerPrefix}`;
		}

		// db.ts and mail.ts go to lib/server/ (shared across features)
		if (relativePath === "db.ts" || relativePath === "mail.ts") {
			return `lib/server/${relativePath}`;
		}

		// Everything else (rate-limit, types, schemas, index.ts, etc.)
		// goes to lib/server/auth/
		return `lib/server/auth/${relativePath}`;
	}
}
