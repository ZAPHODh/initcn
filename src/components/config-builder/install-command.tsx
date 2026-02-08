"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useConfig, useVariant } from "./config-provider";
import { VARIANTS } from "./types";
import { cn } from "@/lib/utils";

type Feature = keyof typeof VARIANTS;
type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

interface InstallCommandProps {
	feature: Feature;
	className?: string;
}

const PM_COMMANDS: Record<PackageManager, string> = {
	pnpm: "pnpm dlx",
	npm: "npx",
	yarn: "yarn dlx",
	bun: "bunx",
};

const PACKAGE_MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

export function InstallCommand({ feature, className }: InstallCommandProps) {
	const [activePm, setActivePm] = useState<PackageManager>("pnpm");
	const [copied, setCopied] = useState(false);
	const { config, isLoaded } = useConfig();

	const variants = isLoaded ? useVariant(feature) : null;

	if (!variants || variants.length === 0) {
		return (
			<div className={cn("rounded-lg border bg-fd-card p-4", className)}>
				<p className="text-fd-muted-foreground text-sm">
					This configuration is not yet available for {config.framework} +{" "}
					{config.orm}.
					<br />
					<span className="text-xs">
						Showing default for Next.js + Prisma instead.
					</span>
				</p>
			</div>
		);
	}


	const commands = variants.map(
		(variant) => `${PM_COMMANDS[activePm]} shadcn@latest add @initcn/${variant}`,
	);
	const command = commands.join(" && ");

	const handleCopy = async () => {
		await navigator.clipboard.writeText(command);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			className={cn("rounded-lg border bg-fd-card overflow-hidden", className)}
		>
			<div className="flex border-b bg-fd-muted/30">
				{PACKAGE_MANAGERS.map((pm) => (
					<button
						key={pm}
						type="button"
						onClick={() => setActivePm(pm)}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors",
							activePm === pm
								? "bg-fd-background text-fd-foreground border-b-2 border-fd-primary -mb-px"
								: "text-fd-muted-foreground hover:text-fd-foreground",
						)}
					>
						{pm}
					</button>
				))}
			</div>

			<div className="relative p-4">
				<pre className="overflow-x-auto">
					<code className="text-sm font-mono">{command}</code>
				</pre>
				<button
					type="button"
					onClick={handleCopy}
					className="absolute top-3 right-3 p-2 rounded-md hover:bg-fd-muted transition-colors"
					aria-label="Copy command"
				>
					{copied ? (
						<Check className="size-4" />
					) : (
						<Copy className="size-4 text-fd-muted-foreground" />
					)}
				</button>
			</div>

			{variants.length > 1 && (
				<div className="px-4 pb-4 pt-0">
					<p className="text-xs text-fd-muted-foreground">
						This will install {variants.length} packages: {variants.join(", ")}
					</p>
				</div>
			)}
		</div>
	);
}

export function FeatureInstallCommands() {
	const features: { id: Feature; name: string; description: string }[] = [
		{
			id: "auth",
			name: "Authentication",
			description: "OTP + OAuth authentication with email verification",
		},
		{
			id: "payments",
			name: "Payments",
			description: "Stripe subscription management with webhooks",
		},
		{
			id: "i18n",
			name: "Internationalization",
			description: "Type-safe i18n with next-international",
		},
	];

	return (
		<div className="space-y-6">
			{features.map((feature) => (
				<div key={feature.id} className="space-y-2">
					<h3 className="font-semibold">{feature.name}</h3>
					<p className="text-sm text-fd-muted-foreground">
						{feature.description}
					</p>
					<InstallCommand feature={feature.id} />
				</div>
			))}
		</div>
	);
}
