import type { PluginOptions } from "fumadocs-registry";

export default {
  baseUrl: "https://initcn.vercel.app/r",
  registry: {
    name: "initcn",
    homepage: "https://initcn.vercel.app",
  },
  componentsDirs: [
    { name: "lib", type: "lib" },
    { name: "ui", type: "ui" },
    // infra/ handled by custom build script (build-infra-registry.ts)
  ],
  docsDirs: ["content/docs"],
} satisfies PluginOptions;
