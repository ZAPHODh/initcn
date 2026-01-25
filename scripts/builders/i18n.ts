/**
 * Internationalization infrastructure builder
 * Handles all i18n-* registry items (i18n, i18n-with-server-actions, etc.)
 */

import { BaseInfraBuilder } from "./base-builder.js";
import type { ConfigJson } from "./shared.js";

export class I18nBuilder extends BaseInfraBuilder {
	canHandle(registryName: string, _config?: ConfigJson): boolean {
		return registryName.startsWith("i18n-") || registryName === "i18n";
	}

	getFeatureName(): string {
		return "i18n";
	}

	// I18n-specific overrides can be added here if needed
	// The base class handles all the default mappings including locales/
}
