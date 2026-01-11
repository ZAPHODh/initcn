/**
 * Authentication infrastructure builder
 * Handles all auth-* registry items (auth-otp-shared, auth-otp-prisma, auth-otp-drizzle, etc.)
 */

import { relative } from "node:path";
import type { InfraBuilder } from "./shared.js";

export class AuthBuilder implements InfraBuilder {
	canHandle(registryName: string): boolean {
		return registryName.startsWith("auth-") || registryName === "auth";
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

		// Everything else (server code, db, actions, schemas, types, client, etc.)
		// goes to lib/server/auth/
		return `lib/server/auth/${relativePath}`;
	}
}
