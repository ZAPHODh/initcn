"use client";

import { Children, type ReactNode } from "react";
import { useConfig } from "./config-provider";
import type { Framework } from "./types";

interface ForFrameworkProps {
	value: Framework | Framework[];
	children: ReactNode;
}


export function ForFramework({ children }: ForFrameworkProps) {
	return <>{children}</>;
}

interface FrameworkContentProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export function FrameworkContent({ children, fallback }: FrameworkContentProps) {
	const { config } = useConfig();

	let match: ReactNode = null;

	Children.forEach(children, (child) => {
		if (!match && isForFrameworkElement(child)) {
			const values = Array.isArray(child.props.value)
				? child.props.value
				: [child.props.value];
			if (values.includes(config.framework)) {
				match = child.props.children;
			}
		}
	});

	return <>{match ?? fallback}</>;
}

function isForFrameworkElement(
	child: unknown,
): child is React.ReactElement<ForFrameworkProps> {
	return (
		typeof child === "object" &&
		child !== null &&
		"props" in child &&
		typeof (child as { props: unknown }).props === "object" &&
		(child as { props: unknown }).props !== null &&
		"value" in (child as { props: Record<string, unknown> }).props
	);
}
