const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const providersDir = path.join(__dirname, "..", "providers");
const outputDir = path.join(__dirname, "..", "dist");
const manifestPath = path.join(__dirname, "..", "manifest.json");

async function main() {
  let manifest = [];
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {}

  const providerDirs = fs
    .readdirSync(providersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const providerDir of providerDirs) {
    const sourceDir = path.join(providersDir, providerDir.name);
    const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".ts"));
    const manifestEntry = manifest.find((p) => p.value === providerDir.name);
    const version = manifestEntry ? manifestEntry.version : "1.0.0";
    const banner = `// @vega-provider ${providerDir.name}\n// @vega-version ${version}\n"use strict";`;

    for (const file of files) {
      await esbuild.build({
        entryPoints: [path.join(sourceDir, file)],
        outfile: path.join(outputDir, providerDir.name, file.replace(/\.ts$/, ".js")),
        bundle: true,
        // FIX: Vega runs provider modules with new Function() in an
        // artificial CommonJS environment (exports object, no ESM).
        // format "esm" made every module fail at load with
        // "Unexpected token 'export'" — catalog stage failed, Home
        // went black, and the in-app provider test failed. CJS is
        // what Vega expects (see vega-app ProviderManager docs).
        format: "cjs",
        platform: "browser",
        target: "es2020",
        banner: {
          js: banner,
        },
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
