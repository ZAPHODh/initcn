export type ORM = "prisma" | "none" | "drizzle";

export interface ProjectConfig {
  orm: ORM;
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
];

// Variant mapping based on ORM selection
export const VARIANTS = {
  auth: { prisma: "otp", none: "otp-shared", drizzle: null },
  payments: {
    prisma: "subscription",
    none: "subscription-shared",
    drizzle: null,
  },
  i18n: { prisma: "i18n", none: "i18n", drizzle: "i18n" },
} as const;
