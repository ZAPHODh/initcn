#!/usr/bin/env tsx
/**
 * Build script for generating infrastructure registry items
 *
 * Auto-discovers any directory in src/registry/infra/ with a config.json file
 * and generates shadcn-compatible registry JSON files.
 *
 * Uses auto-discovered builders to determine correct target paths for each infrastructure type.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { siteConfig } from "../src/config/site.js";
import {
	ROOT_DIR,
	INFRA_DIR,
	getAllRegistryFiles,
	getFileType,
	toRegistryUrl,
	writeRegistryItem,
	type ConfigJson,
	type RegistryFile,
	type RegistryItem,
	type InfraBuilder,
	type OrmType,
	type FrameworkType,
} from "./builders/shared.js";
import { discoverBuilders, getBuilder } from "./builders/registry.js";

/**
 * Validates config.json schema
 */
function validateConfig(config: ConfigJson, configPath: string): void {
	const required = ["name", "type", "title", "description"];
	const missing = required.filter(
		(field) => !config[field as keyof ConfigJson],
	);

	if (missing.length > 0) {
		throw new Error(
			`Invalid config.json at ${configPath}: missing required fields: ${missing.join(", ")}`,
		);
	}

	// Validate capabilities if present
	if (config.capabilities) {
		const validOrms: OrmType[] = ["prisma", "drizzle", "typeorm", "none", "*"];
		const validFrameworks: FrameworkType[] = [
			"nextjs",
			"vite",
			"remix",
			"astro",
			"*",
		];

		if (config.capabilities.orm) {
			const invalid = config.capabilities.orm.filter(
				(orm) => !validOrms.includes(orm),
			);
			if (invalid.length > 0) {
				throw new Error(
					`Invalid ORM types in ${configPath}: ${invalid.join(", ")}. ` +
						`Valid: ${validOrms.join(", ")}`,
				);
			}
		}

		if (config.capabilities.framework) {
			const invalid = config.capabilities.framework.filter(
				(fw) => !validFrameworks.includes(fw),
			);
			if (invalid.length > 0) {
				throw new Error(
					`Invalid framework types in ${configPath}: ${invalid.join(", ")}. ` +
						`Valid: ${validFrameworks.join(", ")}`,
				);
			}
		}
	}
}

/**
 * Generates a registry item from a config.json and its source directory
 */
function generateRegistry(
	configPath: string,
	sourceDir: string,
	ourRegistryNames: Set<string>,
	builders: InfraBuilder[],
): RegistryItem {
	// Read config.json
	const config: ConfigJson = JSON.parse(readFileSync(configPath, "utf-8"));

	// Validate config.json schema
	validateConfig(config, configPath);

	// Get the appropriate builder for this registry
	const builder = getBuilder(config.name, config, builders);

	// Get all registry files in the directory
	const allFiles = getAllRegistryFiles(sourceDir);

	const registryFiles: RegistryFile[] = allFiles.map((filePath) => ({
		path: relative(ROOT_DIR, filePath),
		content: readFileSync(filePath, "utf-8"),
		type: getFileType(filePath, sourceDir),
		target: builder.getTargetPath(filePath, sourceDir, config.name, config),
	}));

	const item: RegistryItem = {
		$schema: "https://ui.shadcn.com/schema/registry-item.json",
		name: config.name,
		type: "registry:lib",
		title: config.title,
		description: config.description,
		files: registryFiles,
		dependencies: config.dependencies,
		devDependencies: config.devDependencies,
	};

	if (config.registryDependencies && config.registryDependencies.length > 0) {
		// Only convert to full URLs for components that exist in our registry
		// Leave other component names as-is so shadcn fetches them from the default registry
		item.registryDependencies = config.registryDependencies.map((dep) => {
			// Check if this is a URL already
			if (dep.startsWith("http://") || dep.startsWith("https://")) {
				return dep;
			}
			// Check if this dependency is one of our registry items
			if (ourRegistryNames.has(dep)) {
				return toRegistryUrl(dep, siteConfig.registryUrl);
			}
			// Otherwise, leave as component name for shadcn's default registry
			return dep;
		});
	}

	return item;
}

async function main() {
	console.log("🔨 Building infrastructure registry items...\n");

	if (!existsSync(INFRA_DIR)) {
		console.log("⚠️  No infra directory found. Skipping infrastructure build.");
		return;
	}

	// Auto-discover builders
	console.log("📦 Discovering builders...");
	const builders = await discoverBuilders();
	console.log(`   Found ${builders.length} builders\n`);

	// Auto-discover all directories with config.json
	const infraDirs = readdirSync(INFRA_DIR).filter((name) => {
		const dirPath = join(INFRA_DIR, name);
		const configPath = join(dirPath, "config.json");
		return statSync(dirPath).isDirectory() && existsSync(configPath);
	});

	if (infraDirs.length === 0) {
		console.log("⚠️  No infrastructure configs found (no config.json files).");
		return;
	}

	// First pass: collect all our registry item names
	const ourRegistryNames = new Set<string>();
	for (const dirName of infraDirs) {
		const configPath = join(INFRA_DIR, dirName, "config.json");
		const config: ConfigJson = JSON.parse(readFileSync(configPath, "utf-8"));
		ourRegistryNames.add(config.name);
	}

	// Second pass: build each infrastructure config
	for (const dirName of infraDirs) {
		const sourceDir = join(INFRA_DIR, dirName);
		const configPath = join(sourceDir, "config.json");

		try {
			const item = generateRegistry(configPath, sourceDir, ourRegistryNames, builders);
			writeRegistryItem(item);
		} catch (error) {
			console.error(`❌ Failed to build ${dirName}:`, error);
			throw error;
		}
	}

	console.log(`\n✨ Done! Generated ${infraDirs.length} infrastructure items.`);
}

main();
