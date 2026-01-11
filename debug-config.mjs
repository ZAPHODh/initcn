import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const CONFIG_FILES = [
  "registry.config.ts",
  "registry.config.js",
  "registry.config.mjs"
];

async function loadConfig() {
  for (const configFile of CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), configFile);
    console.log(`Trying: ${configPath}`);

    try {
      await fs.access(configPath);
      console.log(`  ✓ File exists`);

      try {
        // Try with file:// URL (Windows-compatible)
        const fileUrl = pathToFileURL(configPath).href;
        console.log(`  Importing: ${fileUrl}`);
        const config = await import(fileUrl);
        console.log(`  ✓ Loaded successfully`);
        return config.default || config;
      } catch (importError) {
        console.log(`  ✗ Import failed: ${importError.message}`);
      }
    } catch (accessError) {
      console.log(`  ✗ File not found`);
    }
  }
  return null;
}

const config = await loadConfig();
console.log('\nFinal config:', config);
