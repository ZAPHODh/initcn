"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import type { ORM, ProjectConfig } from "./types";
import { VARIANTS } from "./types";

const STORAGE_KEY = "initcn-config";

interface ConfigContextValue {
  config: ProjectConfig;
  setOrm: (v: ORM) => void;
  isLoaded: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  const [orm, setOrmState] = useQueryState(
    "orm",
    parseAsStringLiteral(["prisma", "none", "drizzle"] as const).withDefault(
      "prisma"
    )
  );

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ProjectConfig;
        if (parsed.orm && !window.location.search.includes("orm=")) {
          setOrmState(parsed.orm);
        }
      } catch {
        // Invalid stored value, ignore
      }
    }
    setIsLoaded(true);
  }, [setOrmState]);

  // Persist to localStorage when config changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ orm }));
    }
  }, [orm, isLoaded]);

  const setOrm = (v: ORM) => {
    setOrmState(v);
  };

  return (
    <ConfigContext.Provider value={{ config: { orm }, setOrm, isLoaded }}>
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

// Hook to get variant name for a feature
export function useVariant(feature: keyof typeof VARIANTS): string | null {
  const { config } = useConfig();
  return VARIANTS[feature][config.orm];
}
