/**
 * Shared utilities for infrastructure registry builders
 */

import {
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
	mkdirSync,
} from "node:fs";
import { join, relative, extname } from "node:path";

export const ROOT_DIR = process.cwd();
export const INFRA_DIR = join(ROOT_DIR, "src/registry/infra");
export const OUTPUT_DIR = join(ROOT_DIR, "public/r");

export type OrmType = "prisma" | "drizzle" | "typeorm" | "none" | "*";
export type FrameworkType = "nextjs" | "vite" | "tanstack-start" | "remix" | "astro" | "*";

export interface ConfigJson {
	name: string;
	type: string;
	title: string;
	description: string;
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies?: string[];

	// NEW: Stack capabilities
	capabilities?: {
		orm?: OrmType[];
		framework?: FrameworkType[];
	};

	// NEW: Installation requirements
	requires?: {
		orm?: OrmType;
		framework?: FrameworkType;
	};

	// NEW: File target overrides per framework
	targetMappings?: {
		[framework: string]: {
			[sourcePattern: string]: string;
		};
	};
}

export interface RegistryFile {
	path: string;
	content: string;
	type: "registry:lib" | "registry:block" | "registry:page";
	target: string;
}

export interface RegistryItem {
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

/**
 * Recursively finds all registry files in a directory
 * Includes TypeScript files and .env.example.* files
 * Excludes index.ts, config.json, and schema files
 */
export function getAllRegistryFiles(dir: string): string[] {
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

				// Include .env.example.* files
				if (item.startsWith(".env.example.")) {
					files.push(fullPath);
				}
				// Include TypeScript files (excluding index.ts and schemas)
				else if (
					(ext === ".ts" || ext === ".tsx") &&
					item !== "index.ts" &&
					!item.includes("schema")
				) {
					files.push(fullPath);
				}
			}
		}
	}

	walk(dir);
	return files;
}

/**
 * Determines the file type based on the relative path
 */
export function getFileType(
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

/**
 * Converts registry dependency names to full URLs
 */
export function toRegistryUrl(name: string, registryBaseUrl: string): string {
	return `${registryBaseUrl}/${name}.json`;
}

/**
 * Writes a registry item to the output directory as JSON
 */
export function writeRegistryItem(item: RegistryItem) {
	const outputPath = join(OUTPUT_DIR, `${item.name}.json`);
	const content = JSON.stringify(item, null, 2);

	mkdirSync(OUTPUT_DIR, { recursive: true });
	writeFileSync(outputPath, content, "utf-8");

	console.log(`✓ Generated ${item.name}.json (${item.files.length} files)`);
}

/**
 * Builder interface that all infrastructure builders must implement
 */
export interface InfraBuilder {
	/**
	 * Checks if this builder can handle the given registry name
	 */
	canHandle(registryName: string, config?: ConfigJson): boolean;

	/**
	 * Determines the target path for a source file
	 */
	getTargetPath(
		filePath: string,
		sourceDir: string,
		registryName: string,
		config?: ConfigJson,
	): string;
}
