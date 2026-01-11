#!/usr/bin/env tsx
/**
 * Build script for generating auth-otp registry items
 *
 * Generates registry JSON files for:
 * - auth-otp-shared (database-agnostic shared code)
 * - auth-otp-prisma (Prisma implementation)
 * - auth-otp-drizzle (Drizzle implementation)
 * - auth-otp (alias for auth-otp-prisma)
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
const SHARED_SOURCE_DIR = join(ROOT_DIR, "src/registry/lib/auth-otp-shared");
const PRISMA_SOURCE_DIR = join(ROOT_DIR, "src/registry/lib/auth-otp-prisma");
const DRIZZLE_SOURCE_DIR = join(ROOT_DIR, "src/registry/lib/auth-otp-drizzle");
const OUTPUT_DIR = join(ROOT_DIR, "public/r");

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
				if (ext === ".ts" || ext === ".tsx") {
					files.push(fullPath);
				}
			}
		}
	}

	walk(dir);
	return files;
}

function getTargetPath(filePath: string, sourceDir: string, isShared = false): string {
	const relativePath = relative(sourceDir, filePath);

	// For shared files, everything goes to lib/auth-otp-shared/
	if (isShared) {
		return `lib/auth-otp-shared/${relativePath}`;
	}

	// API routes go to app/api/
	if (relativePath.startsWith("api/")) {
		return `app/${relativePath}`;
	}

	// App pages go to app/
	if (relativePath.startsWith("app/")) {
		return relativePath;
	}

	// Components go to components/
	if (relativePath.startsWith("components/")) {
		const filename = relativePath.split("/").pop();
		return `components/${filename}`;
	}

	// Emails go to emails/
	if (relativePath.startsWith("emails/")) {
		return relativePath;
	}

	// Everything else goes to lib/auth-otp-prisma/ or lib/auth-otp-drizzle/
	// Determine which based on sourceDir
	const isDrizzle = sourceDir.includes("auth-otp-drizzle");
	return isDrizzle
		? `lib/auth-otp-drizzle/${relativePath}`
		: `lib/auth-otp-prisma/${relativePath}`;
}

function getFileType(
	filePath: string,
	sourceDir: string,
): "registry:lib" | "registry:block" | "registry:page" {
	const relativePath = relative(sourceDir, filePath);

	if (relativePath.startsWith("components/") || relativePath.startsWith("emails/")) {
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
	name: string,
	title: string,
	description: string,
	sourceDir: string,
	dependencies: string[],
	devDependencies: string[],
	registryDependencies: string[] = [],
	isShared = false,
): RegistryItem {
	const allFiles = getAllTsFiles(sourceDir);

	const registryFiles: RegistryFile[] = allFiles.map((filePath) => ({
		path: relative(ROOT_DIR, filePath),
		content: readFileSync(filePath, "utf-8"),
		type: getFileType(filePath, sourceDir),
		target: getTargetPath(filePath, sourceDir, isShared),
	}));

	const item: RegistryItem = {
		$schema: "https://ui.shadcn.com/schema/registry-item.json",
		name,
		type: "registry:lib",
		title,
		description,
		files: registryFiles,
		dependencies,
		devDependencies,
	};

	if (registryDependencies.length > 0) {
		item.registryDependencies = registryDependencies.map(toRegistryUrl);
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
	console.log("🔨 Building auth-otp registry items...\n");

	// Generate auth-otp-shared
	if (existsSync(SHARED_SOURCE_DIR)) {
		const sharedItem = generateRegistry(
			"auth-otp-shared",
			"Auth OTP (Shared)",
			"Database-agnostic shared code for OTP authentication",
			SHARED_SOURCE_DIR,
			[
				"@oslojs/crypto",
				"@oslojs/encoding",
				"next-safe-action",
				"@tanstack/react-form",
				"sonner",
			],
			[],
			["input-otp"],
			true, // isShared
		);
		writeRegistryItem(sharedItem);
	}

	// Generate auth-otp-prisma
	if (existsSync(PRISMA_SOURCE_DIR)) {
		const prismaItem = generateRegistry(
			"auth-otp-prisma",
			"Auth OTP (Prisma + Google)",
			"OTP and Google OAuth authentication with Prisma ORM",
			PRISMA_SOURCE_DIR,
			[
				"@prisma/client",
				"resend",
				"@upstash/ratelimit",
				"@upstash/redis",
				"arctic",
			],
			["prisma"],
			["auth-otp-shared"],
			false,
		);
		writeRegistryItem(prismaItem);

		// Create auth-otp alias
		const aliasItem = { ...prismaItem, name: "auth-otp" };
		writeRegistryItem(aliasItem);
		console.log("  (alias for auth-otp-prisma)\n");
	}

	// Generate auth-otp-drizzle
	if (existsSync(DRIZZLE_SOURCE_DIR)) {
		const drizzleItem = generateRegistry(
			"auth-otp-drizzle",
			"Auth OTP (Drizzle + Google)",
			"OTP and Google OAuth authentication with Drizzle ORM",
			DRIZZLE_SOURCE_DIR,
			[
				"drizzle-orm",
				"postgres",
				"resend",
				"@upstash/ratelimit",
				"@upstash/redis",
				"arctic",
			],
			["drizzle-kit"],
			["auth-otp-shared"],
			false,
		);
		writeRegistryItem(drizzleItem);
	}

	console.log("✨ Done!");
}

main();
