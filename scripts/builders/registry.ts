/**
 * Auto-discovers and registers all builder modules
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { InfraBuilder, ConfigJson } from "./shared.js";

const BUILDERS_DIR = import.meta.dirname;

/**
 * Discovers all builder classes by scanning the builders/ directory
 * Dynamically imports each builder module and instantiates the builder class
 */
export async function discoverBuilders(): Promise<InfraBuilder[]> {
	const builders: InfraBuilder[] = [];

	// Find all .ts files in builders/ directory (except shared.ts, registry.ts, base-builder.ts)
	const files = readdirSync(BUILDERS_DIR).filter(
		(f) =>
			f.endsWith(".ts") &&
			f !== "shared.ts" &&
			f !== "registry.ts" &&
			f !== "base-builder.ts",
	);

	// Dynamically import each builder
	for (const file of files) {
		try {
			const module = await import(`./${file}`);

			// Find the builder class (convention: PascalCase ending in "Builder")
			const BuilderClass = Object.values(module).find(
				(exp: unknown) =>
					typeof exp === "function" && (exp as { name: string }).name.endsWith("Builder"),
			) as (new () => InfraBuilder) | undefined;

			if (BuilderClass) {
				builders.push(new BuilderClass());
				console.log(`  ✓ Registered builder: ${BuilderClass.name}`);
			}
		} catch (error) {
			console.error(`  ✗ Failed to load builder from ${file}:`, error);
		}
	}

	return builders;
}

/**
 * Finds the appropriate builder for a config
 * Returns the first builder that can handle the registry name
 */
export function getBuilder(
	registryName: string,
	config: ConfigJson,
	builders: InfraBuilder[],
): InfraBuilder {
	const builder = builders.find((b) => b.canHandle(registryName, config));

	if (!builder) {
		throw new Error(
			`No builder found for registry "${registryName}". ` +
				`Available builders: ${builders.map((b) => b.constructor.name).join(", ")}`,
		);
	}

	return builder;
}
