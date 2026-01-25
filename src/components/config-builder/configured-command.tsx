"use client";

import { useConfig } from "./config-provider";
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

  if (!isLoaded) {
    // Show loading state with default variant
    const defaultVariant = VARIANTS[feature].prisma;
    return <span>{`${PM_COMMANDS[pm]} shadcn@latest add @initcn/${defaultVariant}`}</span>;
  }

  const variant = VARIANTS[feature][config.orm];

  if (!variant) {
    return <span className="text-fd-muted-foreground">Coming soon...</span>;
  }

  return <span>{`${PM_COMMANDS[pm]} shadcn@latest add @initcn/${variant}`}</span>;
}

// Export a component that shows the current ORM selection as a badge
export function CurrentOrmBadge() {
  const { config, isLoaded } = useConfig();

  if (!isLoaded) return null;

  const labels: Record<string, string> = {
    prisma: "Prisma",
    none: "No database",
    drizzle: "Drizzle",
  };

  return (
    <span className="inline-flex items-center rounded-md bg-fd-primary/10 px-2 py-1 text-xs font-medium text-fd-primary">
      {labels[config.orm]}
    </span>
  );
}
