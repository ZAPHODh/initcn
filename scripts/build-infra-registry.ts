#!/usr/bin/env tsx
/**
 * Build script for generating infrastructure registry items
 *
 * Auto-discovers any directory in src/registry/infra/ with a config.json file
 * and generates shadcn-compatible registry JSON files.
 *
 * Uses per-infra builders to determine correct target paths for each infrastructure type.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { siteConfig } from "../src/config/site.js";
import {
	ROOT_DIR,
	INFRA_DIR,
	getAllTsFiles,
	getFileType,
	toRegistryUrl,
	writeRegistryItem,
	type ConfigJson,
	type RegistryFile,
	type RegistryItem,
	type InfraBuilder,
} from "./builders/shared.js";
import { AuthBuilder } from "./builders/auth.js";
import { I18nBuilder } from "./builders/i18n.js";

// Register all available builders
const builders: InfraBuilder[] = [
	new AuthBuilder(),
	new I18nBuilder(),
	// Add new builders here as needed
];

/**
 * Finds the appropriate builder for a given registry name
 * Falls back to the first builder (auth) if no match is found for backward compatibility
 */
function getBuilder(registryName: string): InfraBuilder {
	const builder = builders.find((b) => b.canHandle(registryName));
	if (!builder) {
		console.warn(
			`⚠️  No builder found for registry "${registryName}", falling back to auth builder`,
		);
		return builders[0]; // fallback to auth builder
	}
	return builder;
}

/**
 * Generates a registry item from a config.json and its source directory
 */
function generateRegistry(
	configPath: string,
	sourceDir: string,
): RegistryItem {
	// Read config.json
	const config: ConfigJson = JSON.parse(readFileSync(configPath, "utf-8"));

	// Get the appropriate builder for this registry
	const builder = getBuilder(config.name);

	// Get all TypeScript files in the directory
	const allFiles = getAllTsFiles(sourceDir);

	const registryFiles: RegistryFile[] = allFiles.map((filePath) => ({
		path: relative(ROOT_DIR, filePath),
		content: readFileSync(filePath, "utf-8"),
		type: getFileType(filePath, sourceDir),
		target: builder.getTargetPath(filePath, sourceDir, config.name),
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
		item.registryDependencies = config.registryDependencies.map((dep) =>
			toRegistryUrl(dep, siteConfig.registryUrl),
		);
	}

	return item;
}

function main() {
	console.log("🔨 Building infrastructure registry items...\n");

	if (!existsSync(INFRA_DIR)) {
		console.log("⚠️  No infra directory found. Skipping infrastructure build.");
		return;
	}

	// Auto-discover all directories with config.json
	const infraDirs = readdirSync(INFRA_DIR).filter((name) => {
		const dirPath = join(INFRA_DIR, name);
		const configPath = join(dirPath, "config.json");
		return statSync(dirPath).isDirectory() && existsSync(configPath);
	});

	if (infraDirs.length === 0) {
		console.log(
			"⚠️  No infrastructure configs found (no config.json files).",
		);
		return;
	}

	// Build each infrastructure config
	for (const dirName of infraDirs) {
		const sourceDir = join(INFRA_DIR, dirName);
		const configPath = join(sourceDir, "config.json");

		const item = generateRegistry(configPath, sourceDir);
		writeRegistryItem(item);
	}

	console.log(`\n✨ Done! Generated ${infraDirs.length} infrastructure items.`);
}

main();
