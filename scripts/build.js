const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const providersDir = path.join(__dirname, "..", "providers");
const outputDir = path.join(__dirname, "..", "dist");

async function main() {
  const providerDirs = fs
    .readdirSync(providersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const providerDir of providerDirs) {
    const sourceDir = path.join(providersDir, providerDir.name);
    const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      await esbuild.build({
        entryPoints: [path.join(sourceDir, file)],
        outfile: path.join(outputDir, providerDir.name, file.replace(/\.ts$/, ".js")),
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "es2020",
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
