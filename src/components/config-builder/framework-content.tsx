"use client";

import type { ReactNode } from "react";
import { useConfig } from "./config-provider";

interface FrameworkContentProps {
	nextjs?: ReactNode;
	vite?: ReactNode;
	tanstack?: ReactNode;
	fallback?: ReactNode;
}

export function FrameworkContent({
	nextjs,
	vite,
	tanstack,
	fallback,
}: FrameworkContentProps) {
	const { config } = useConfig();

	switch (config.framework) {
		case "nextjs":
			return <>{nextjs ?? fallback}</>;
		case "vite":
			return <>{vite ?? fallback}</>;
		case "tanstack-start":
			return <>{tanstack ?? fallback}</>;
		default:
			return <>{fallback}</>;
	}
}
