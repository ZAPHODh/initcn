"use client";

import { useConfig, useVariant } from "./config-provider";
import { VARIANTS } from "./types";

type Feature = keyof typeof VARIANTS;
type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

interface ConfiguredCommandProps {
	feature: Feature;
	pm: PackageManager;
}

const PM_COMMANDS: Record<PackageManager, string> = {
	pnpm: "pnpm dlx",
	npm: "npx",
	yarn: "yarn dlx",
	bun: "bunx",
};

export function ConfiguredCommand({ feature, pm }: ConfiguredCommandProps) {
	const { config, isLoaded } = useConfig();
	const variants = useVariant(feature);

	if (!isLoaded) {
		// Show loading state with default variant (Next.js + Prisma)
		const defaultVariant =
			VARIANTS[feature].monolithic.prisma.nextjs;
		return (
			<span>{`${PM_COMMANDS[pm]} shadcn@latest add @initcn/${defaultVariant}`}</span>
		);
	}

	if (!variants || variants.length === 0) {
		return <span className="text-fd-muted-foreground">Coming soon...</span>;
	}

	// Build install command (may install multiple packages for layered approach)
	const commands = variants.map(
		(variant) => `${PM_COMMANDS[pm]} shadcn@latest add @initcn/${variant}`,
	);
	const command = commands.join(" && ");

	return <span>{command}</span>;
}

// Export a component that shows the current stack selection as badges
export function CurrentStackBadge() {
	const { config, isLoaded } = useConfig();

	if (!isLoaded) return null;

	const ormLabels: Record<string, string> = {
		prisma: "Prisma",
		none: "No database",
		drizzle: "Drizzle",
		typeorm: "TypeORM",
	};

	const frameworkLabels: Record<string, string> = {
		nextjs: "Next.js",
		vite: "Vite",
		remix: "Remix",
		astro: "Astro",
	};

	return (
		<span className="inline-flex items-center gap-2">
			<span className="inline-flex items-center rounded-md bg-fd-primary/10 px-2 py-1 text-xs font-medium text-fd-primary">
				{frameworkLabels[config.framework]}
			</span>
			<span className="inline-flex items-center rounded-md bg-fd-primary/10 px-2 py-1 text-xs font-medium text-fd-primary">
				{ormLabels[config.orm]}
			</span>
		</span>
	);
}

// Keep backward compatible export
export const CurrentOrmBadge = CurrentStackBadge;
