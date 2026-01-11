#!/usr/bin/env tsx
/**
 * Build script for generating infrastructure registry items
 *
 * Auto-discovers any directory in src/registry/infra/ with a config.json file
 * and generates shadcn-compatible registry JSON files.
 *
 * This is a metadata-driven approach that uses config.json for registry metadata
 * while preserving the existing file mapping logic for target paths.
 */

import {
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
	mkdirSync,
	existsSync,
} from "node:fs";
import { join, relative, extname } from "node:path";
import { siteConfig } from "../src/config/site.js";

const ROOT_DIR = process.cwd();
const INFRA_DIR = join(ROOT_DIR, "src/registry/infra");
const OUTPUT_DIR = join(ROOT_DIR, "public/r");

interface ConfigJson {
	name: string;
	type: string;
	title: string;
	description: string;
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies?: string[];
}

interface RegistryFile {
	path: string;
	content: string;
	type: "registry:lib" | "registry:block" | "registry:page";
	target: string;
}

interface RegistryItem {
	$schema: string;
	name: string;
	type: "registry:lib";
	title: string;
	description: string;
	files: RegistryFile[];
	dependencies?: string[];
	registryDependencies?: string[];
	devDependencies?: string[];
}

function getAllTsFiles(dir: string): string[] {
	const files: string[] = [];

	function walk(currentDir: string) {
		const items = readdirSync(currentDir);

		for (const item of items) {
			const fullPath = join(currentDir, item);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				walk(fullPath);
			} else if (stat.isFile()) {
				const ext = extname(item);
				// Exclude index.ts and config.json files
				if ((ext === ".ts" || ext === ".tsx") && item !== "index.ts") {
					files.push(fullPath);
				}
			}
		}
	}

	walk(dir);
	return files;
}

function getTargetPath(filePath: string, sourceDir: string): string {
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

	// Everything else (server code, db, actions, etc.) goes to lib/server/auth/
	return `lib/server/auth/${relativePath}`;
}

function getFileType(
	filePath: string,
	sourceDir: string,
): "registry:lib" | "registry:block" | "registry:page" {
	const relativePath = relative(sourceDir, filePath);

	if (
		relativePath.startsWith("components/") ||
		relativePath.startsWith("emails/")
	) {
		return "registry:block";
	}

	if (relativePath.startsWith("app/")) {
		return "registry:page";
	}

	return "registry:lib";
}

function toRegistryUrl(name: string): string {
	return `${siteConfig.registryUrl}/${name}.json`;
}

function generateRegistry(
	configPath: string,
	sourceDir: string,
): RegistryItem {
	// Read config.json
	const config: ConfigJson = JSON.parse(readFileSync(configPath, "utf-8"));

	// Get all TypeScript files in the directory
	const allFiles = getAllTsFiles(sourceDir);

	const registryFiles: RegistryFile[] = allFiles.map((filePath) => ({
		path: relative(ROOT_DIR, filePath),
		content: readFileSync(filePath, "utf-8"),
		type: getFileType(filePath, sourceDir),
		target: getTargetPath(filePath, sourceDir),
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
		item.registryDependencies = config.registryDependencies.map(toRegistryUrl);
	}

	return item;
}

function writeRegistryItem(item: RegistryItem) {
	const outputPath = join(OUTPUT_DIR, `${item.name}.json`);
	const content = JSON.stringify(item, null, 2);

	mkdirSync(OUTPUT_DIR, { recursive: true });
	writeFileSync(outputPath, content, "utf-8");

	console.log(`✓ Generated ${item.name}.json (${item.files.length} files)`);
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
