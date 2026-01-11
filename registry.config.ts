import type { PluginOptions } from "fumadocs-registry";
import { siteConfig } from "./src/config/site.js";

export default {
  baseUrl: siteConfig.registryUrl,
  registry: {
    name: siteConfig.name,
    homepage: siteConfig.url,
  },
  componentsDirs: [
    { name: "lib", type: "lib" },
    { name: "ui", type: "ui" },
  ],
  docsDirs: ["content/docs"],
} satisfies PluginOptions;
