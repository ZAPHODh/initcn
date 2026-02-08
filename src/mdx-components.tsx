import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { Card, Cards } from "fumadocs-ui/components/card";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ComponentPreview } from "@/components/docs/component-preview";
import {
  ConfigModal,
  ConfigToggle,
  InstallCommand,
  FeatureInstallCommands,
  CurrentOrmBadge,
  FrameworkContent,
} from "@/components/config-builder";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    Steps,
    Step,
    TypeTable,
    ComponentPreview,
    Card,
    Cards,
    ConfigModal,
    ConfigToggle,
    InstallCommand,
    FeatureInstallCommands,
    CurrentOrmBadge,
    FrameworkContent,
    ...components,
  };
}
