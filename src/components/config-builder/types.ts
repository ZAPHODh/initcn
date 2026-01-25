export type ORM = "prisma" | "none" | "drizzle" | "typeorm";
export type Framework = "nextjs" | "vite" | "remix" | "astro";

export interface ProjectConfig {
	orm: ORM;
	framework: Framework;
}

export const ORM_OPTIONS = [
	{ value: "prisma" as const, label: "Prisma", available: true },
	{
		value: "none" as const,
		label: "No database",
		description: "Shared utilities only",
		available: true,
	},
	{ value: "drizzle" as const, label: "Drizzle", available: false },
	{ value: "typeorm" as const, label: "TypeORM", available: false },
];

export const FRAMEWORK_OPTIONS = [
	{ value: "nextjs" as const, label: "Next.js", available: true },
	{ value: "vite" as const, label: "Vite + React", available: false },
	{ value: "remix" as const, label: "Remix", available: false },
	{ value: "astro" as const, label: "Astro", available: false },
];

/**
 * Variant strategy determines how packages are organized
 * - monolithic: Single package for each ORM×Framework combination
 * - layered: Separate core, ORM adapter, and framework adapter packages
 */
export type VariantStrategy = "monolithic" | "layered";

/**
 * Two-dimensional variant mapping: Feature → (ORM × Framework) → Registry name(s)
 *
 * Monolithic strategy: Returns single registry item name
 * Layered strategy: Returns array of registry item names to install
 */
export const VARIANTS = {
	auth: {
		monolithic: {
			prisma: {
				nextjs: "otp", // Current backward-compatible name
				vite: null,
				remix: null,
				astro: null,
			},
			drizzle: {
				nextjs: null,
				vite: null,
				remix: null,
				astro: null,
			},
			typeorm: {
				nextjs: null,
				vite: null,
				remix: null,
				astro: null,
			},
			none: {
				nextjs: "otp-shared", // Current backward-compatible name
				vite: null,
				remix: null,
				astro: null,
			},
		},
	},
	payments: {
		monolithic: {
			prisma: {
				nextjs: "subscription", // Current backward-compatible name
				vite: null,
				remix: null,
				astro: null,
			},
			drizzle: {
				nextjs: null,
				vite: null,
				remix: null,
				astro: null,
			},
			typeorm: {
				nextjs: null,
				vite: null,
				remix: null,
				astro: null,
			},
			none: {
				nextjs: "subscription-shared", // Current backward-compatible name
				vite: null,
				remix: null,
				astro: null,
			},
		},
	},
	i18n: {
		monolithic: {
			prisma: {
				nextjs: "i18n", // Works with all ORMs
				vite: null,
				remix: null,
				astro: null,
			},
			drizzle: {
				nextjs: "i18n",
				vite: null,
				remix: null,
				astro: null,
			},
			typeorm: {
				nextjs: "i18n",
				vite: null,
				remix: null,
				astro: null,
			},
			none: {
				nextjs: "i18n",
				vite: null,
				remix: null,
				astro: null,
			},
		},
	},
} as const;

/**
 * Default strategy per feature
 * Start with monolithic, can migrate to layered later
 */
export const DEFAULT_STRATEGY: Record<
	keyof typeof VARIANTS,
	VariantStrategy
> = {
	auth: "monolithic",
	payments: "monolithic",
	i18n: "monolithic",
};
