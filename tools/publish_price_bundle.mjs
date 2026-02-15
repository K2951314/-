import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_INPUT = "apps/v9/price.bundle.js";
const DEFAULT_OUTPUT_ROOT = "apps/v9";

function resolveFromRoot(inputPath) {
  if (path.isAbsolute(inputPath)) return inputPath;
  return path.join(ROOT_DIR, inputPath);
}

function parseArgs(argv) {
  const out = {
    input: DEFAULT_INPUT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) out.input = args[++i];
    else if (arg === "--output-root" && args[i + 1]) out.outputRoot = args[++i];
  }
  return out;
}

function hashBytes(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function stableManifestJson(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function readJsonSafe(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    return null;
  }
}

async function readTextSafe(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return "";
    throw err;
  }
}

export async function publishPriceBundle(options) {
  const opts = options || {};
  const inputPath = resolveFromRoot(opts.input || DEFAULT_INPUT);
  const outputRoot = resolveFromRoot(opts.outputRoot || DEFAULT_OUTPUT_ROOT);

  const inputBytes = await readFile(inputPath);
  const hash = hashBytes(inputBytes);
  const shortHash = hash.slice(0, 12);
  const relativeLatest = `price/price.${shortHash}.bundle.js`;
  const latestPath = path.join(outputRoot, relativeLatest);
  const manifestPath = path.join(outputRoot, "price-manifest.json");

  const existingManifest = await readJsonSafe(manifestPath);
  const existingLatestText = await readTextSafe(latestPath);
  const inputText = inputBytes.toString("utf8");

  const unchanged =
    existingManifest &&
    existingManifest.hash === hash &&
    String(existingManifest.latest || "") === relativeLatest &&
    existingLatestText === inputText;

  if (unchanged) {
    return {
      changed: false,
      hash,
      latest: relativeLatest,
      manifestPath,
      bundlePath: latestPath,
    };
  }

  await mkdir(path.dirname(latestPath), { recursive: true });
  await writeFile(latestPath, inputBytes);

  const manifest = {
    latest: relativeLatest,
    hash,
    updated_at: new Date().toISOString(),
  };
  await writeFile(manifestPath, stableManifestJson(manifest), "utf8");

  return {
    changed: true,
    hash,
    latest: relativeLatest,
    manifestPath,
    bundlePath: latestPath,
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  publishPriceBundle(args)
    .then((res) => {
      const state = res.changed ? "updated" : "unchanged";
      console.log(
        `[publish-price] ${state} hash=${res.hash} latest=${res.latest} manifest=${res.manifestPath}`
      );
    })
    .catch((err) => {
      console.error(`[publish-price] failed: ${err.message}`);
      process.exit(1);
    });
}
