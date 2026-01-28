"use client";

import {
	createContext,
	useContext,
	useOptimistic,
	useTransition,
	type ReactNode,
} from "react";
import { setConfigAction } from "@/actions/config";
import type { ORM, Framework, ProjectConfig } from "./types";
import { VARIANTS, DEFAULT_STRATEGY } from "./types";

interface ConfigContextValue {
	config: ProjectConfig;
	setOrm: (v: ORM) => void;
	setFramework: (v: Framework) => void;
	isPending: boolean;
	isLoaded: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({
	children,
	initialConfig,
}: {
	children: ReactNode;
	initialConfig: ProjectConfig;
}) {
	const [isPending, startTransition] = useTransition();
	const [optimisticConfig, setOptimisticConfig] =
		useOptimistic(initialConfig);

	const setOrm = (orm: ORM) => {
		const newConfig = { ...optimisticConfig, orm };

		startTransition(async () => {
			setOptimisticConfig(newConfig);
			await setConfigAction(newConfig);
		});
	};

	const setFramework = (framework: Framework) => {
		const newConfig = { ...optimisticConfig, framework };

		startTransition(async () => {
			setOptimisticConfig(newConfig);
			await setConfigAction(newConfig);
		});
	};

	return (
		<ConfigContext.Provider
			value={{ config: optimisticConfig, setOrm, setFramework, isPending, isLoaded: true }}
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

export function useVariant(feature: keyof typeof VARIANTS): string[] | null {
	const { config } = useConfig();
	const variants = VARIANTS[feature];

	// i18n and other framework-only features (no ORM dimension)
	if (!("monolithic" in variants)) {
		// Framework-only feature
		const variant = variants[config.framework];
		return variant ? [variant] : null;
	}

	const strategy = DEFAULT_STRATEGY[feature] || "monolithic";

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
