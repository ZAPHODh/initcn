"use client";

import { Children, type ReactNode } from "react";
import { useConfig } from "./config-provider";
import type { Framework } from "./types";

interface ForFrameworkProps {
	value: Framework | Framework[];
	children: ReactNode;
}

/**
 * Wrap content for a specific framework variant.
 * Used as a child of <FrameworkContent>.
 *
 * @example
 * <FrameworkContent>
 *   <ForFramework value="nextjs">Next.js specific content</ForFramework>
 *   <ForFramework value={["vite", "tanstack-start"]}>Shared content</ForFramework>
 * </FrameworkContent>
 */
export function ForFramework({ children }: ForFrameworkProps) {
	return <>{children}</>;
}

interface FrameworkContentProps {
	children: ReactNode;
	fallback?: ReactNode;
}

/**
 * Renders only the child <ForFramework> block that matches the selected framework.
 *
 * @example
 * <FrameworkContent>
 *   <ForFramework value="nextjs">
 *     Next.js content here
 *   </ForFramework>
 *   <ForFramework value="vite">
 *     Vite content here
 *   </ForFramework>
 * </FrameworkContent>
 */
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
