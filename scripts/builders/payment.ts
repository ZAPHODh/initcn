/**
 * Payment infrastructure builder
 * Handles all payment-* registry items (Stripe subscriptions, billing, etc.)
 */

import { relative } from "node:path";
import type { InfraBuilder } from "./shared.js";

export class PaymentBuilder implements InfraBuilder {
	canHandle(registryName: string): boolean {
		return (
			registryName.startsWith("payment-") ||
			registryName === "payment"
		);
	}

	getTargetPath(
		filePath: string,
		sourceDir: string,
		_registryName: string,
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

		// Actions go to app/actions/
		if (relativePath.startsWith("actions/")) {
			return `app/${relativePath}`;
		}

		// Client code goes to lib/client/
		if (relativePath.startsWith("client/")) {
			return `lib/${relativePath}`;
		}

		// Server code goes to lib/server/payment/ (without nested server/ directory)
		if (relativePath.startsWith("server/")) {
			const pathWithoutServerPrefix = relativePath.substring("server/".length);
			return `lib/server/payment/${pathWithoutServerPrefix}`;
		}

		// Everything else (db, schemas, types, index.ts, etc.)
		// goes to lib/server/payment/
		return `lib/server/payment/${relativePath}`;
	}
}
