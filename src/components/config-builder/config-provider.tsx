"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import type { ORM, Framework, ProjectConfig } from "./types";
import { VARIANTS, DEFAULT_STRATEGY } from "./types";

const STORAGE_KEY = "initcn-config";

interface ConfigContextValue {
	config: ProjectConfig;
	setOrm: (v: ORM) => void;
	setFramework: (v: Framework) => void;
	isLoaded: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
	const [isLoaded, setIsLoaded] = useState(false);

	const [orm, setOrmState] = useQueryState(
		"orm",
		parseAsStringLiteral(["prisma", "none", "drizzle", "typeorm"] as const).withDefault(
			"prisma",
		),
	);

	const [framework, setFrameworkState] = useQueryState(
		"framework",
		parseAsStringLiteral(["nextjs", "vite", "remix", "astro"] as const).withDefault(
			"nextjs",
		),
	);

	// Load from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as ProjectConfig;
				const hasUrlParams =
					window.location.search.includes("orm=") ||
					window.location.search.includes("framework=");
				if (!hasUrlParams) {
					if (parsed.orm) setOrmState(parsed.orm);
					if (parsed.framework) setFrameworkState(parsed.framework);
				}
			} catch {
				// Invalid stored value, ignore
			}
		}
		setIsLoaded(true);
	}, [setOrmState, setFrameworkState]);

	// Persist to localStorage when config changes
	useEffect(() => {
		if (isLoaded) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ orm, framework }));
		}
	}, [orm, framework, isLoaded]);

	const setOrm = (v: ORM) => setOrmState(v);
	const setFramework = (v: Framework) => setFrameworkState(v);

	return (
		<ConfigContext.Provider
			value={{ config: { orm, framework }, setOrm, setFramework, isLoaded }}
		>
			{children}
		</ConfigContext.Provider>
	);
}

export function useConfig() {
	const context = useContext(ConfigContext);
	if (!context) {
		throw new Error("useConfig must be used within ConfigProvider");
	}
	return context;
}

/**
 * Hook to get variant name(s) for a feature based on current config
 * Returns array of registry items to install (for layered) or single item (for monolithic)
 */
export function useVariant(feature: keyof typeof VARIANTS): string[] | null {
	const { config } = useConfig();
	const strategy = DEFAULT_STRATEGY[feature] || "monolithic";
	const variants = VARIANTS[feature];

	// Monolithic strategy: single registry item
	if (strategy === "monolithic" && "monolithic" in variants) {
		const ormVariants = variants.monolithic[config.orm];
		if (ormVariants && typeof ormVariants === "object") {
			const pkg = ormVariants[config.framework];
			return pkg ? [pkg] : null;
		}
	}

	// Layered strategy would be handled here in the future
	// For now, all features use monolithic strategy

	return null;
}
