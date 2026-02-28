import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { homedir } from "os";
import { dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const tauriBin = resolve(appRoot, "node_modules", ".bin", "tauri");
const outputDir = resolve(appRoot, "src-tauri", "icons");

const mode = (process.argv[2] || process.env.BRAND_ICON_THEME || "dark").toLowerCase();
if (mode !== "dark" && mode !== "light" && mode !== "opt1") {
  console.error(`Invalid mode "${mode}". Use "dark", "light", or "opt1".`);
  process.exit(1);
}

const brandingRoot =
  process.env.BRANDING_LOGO_ROOT ||
  resolve(homedir(), "src", "vd-gtm", "branding", "logo", "product", "ui");

const ensure2048Png = (inputPath, outputPath) => {
  const resize = spawnSync(
    "sips",
    ["-s", "format", "png", inputPath, "--resampleHeightWidth", "2048", "2048", "--out", outputPath],
    { cwd: appRoot, stdio: "inherit" },
  );
  if (resize.status !== 0) {
    process.exit(resize.status ?? 1);
  }
};

const modeSource = (() => {
  if (mode === "opt1") {
    const explicit = process.env.BRAND_ICON_SOURCE;
    if (explicit) {
      return resolve(explicit);
    }
    return resolve(brandingRoot, "icon_opt1.png");
  }
  return resolve(brandingRoot, `icon-${mode}.svg`);
})();

const source = modeSource;

if (!existsSync(source)) {
  console.error(`Brand icon source not found: ${source}`);
  if (mode === "opt1") {
    console.error(
      "Place icon_opt1.png in BRANDING_LOGO_ROOT, or set BRAND_ICON_SOURCE to an absolute source file path.",
    );
  } else {
    console.error("Set BRANDING_LOGO_ROOT to the directory containing icon-dark.svg and icon-light.svg.");
  }
  process.exit(1);
}

if (!existsSync(tauriBin)) {
  console.error(`Tauri CLI binary not found: ${tauriBin}`);
  console.error("Run npm install in app/ first.");
  process.exit(1);
}

let tauriSource = source;
if (mode === "opt1") {
  const masterOpt1 = resolve(outputDir, "icon_opt1.png");
  const sourceExt = extname(source).toLowerCase();
  if (sourceExt !== ".png" && sourceExt !== ".svg") {
    console.error(`icon_opt1 source must be .png or .svg: ${source}`);
    process.exit(1);
  }
  console.log(`Generating 2048x2048 icon master at ${masterOpt1}`);
  ensure2048Png(source, masterOpt1);
  tauriSource = masterOpt1;
}

console.log(`Generating Tauri icons from ${tauriSource}`);
console.log(`Output directory: ${outputDir}`);

const result = spawnSync(tauriBin, ["icon", tauriSource, "--output", outputDir], {
  cwd: appRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Done. Generated icon set (${mode}) in src-tauri/icons.`);
