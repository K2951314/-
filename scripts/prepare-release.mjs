import fs from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();
const appDir = path.join(root, "apps", "v9");
const runtimeConfigPath = path.join(appDir, "runtime-config.js");
const indexPath = path.join(appDir, "index.html");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function getUtcDateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function getContentHash(paths) {
  const hash = crypto.createHash("sha256");
  for (const p of paths) {
    hash.update(readUtf8(path.join(root, p)));
  }
  return hash.digest("hex").slice(0, 10);
}

function buildVersion() {
  const fromEnv = String(process.env.RELEASE_VERSION || "").trim();
  if (fromEnv) return fromEnv;
  const hash = getContentHash([
    "apps/v9/index.html",
    "apps/v9/price.bundle.js",
    "apps/v9/runtime-config.js"
  ]);
  return `${getUtcDateStamp()}-${hash}`;
}

function applyVersionPlaceholders(content, version) {
  return content.replace(/__RELEASE_VERSION__/g, version);
}

function main() {
  const version = buildVersion();

  const runtimeConfig = readUtf8(runtimeConfigPath);
  const indexHtml = readUtf8(indexPath);

  const updatedRuntimeConfig = applyVersionPlaceholders(runtimeConfig, version);
  const updatedIndexHtml = applyVersionPlaceholders(indexHtml, version);

  writeUtf8(runtimeConfigPath, updatedRuntimeConfig);
  writeUtf8(indexPath, updatedIndexHtml);

  console.log(`release version: ${version}`);
}

main();
