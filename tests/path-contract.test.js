const assert = require("assert");
const fs = require("fs");
const path = require("path");

function readJson(rel) {
  const full = path.join(process.cwd(), rel);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function exists(rel) {
  return fs.existsSync(path.join(process.cwd(), rel));
}

function run() {
  const system = readJson("config/system.json");
  assert.ok(system.app && system.sync, "system.json missing app/sync sections");

  assert.strictEqual(system.app.web_root, "apps/v9");
  assert.strictEqual(system.app.price_bundle_path, "apps/v9/price.bundle.js");
  assert.strictEqual(system.app.stock_bundle_path, "apps/v9/stock.bundle.js");
  assert.strictEqual(system.sync.script_path, "tools/sync_stock_bundle.mjs");

  assert.ok(exists(system.app.web_root), "web_root does not exist");
  assert.ok(exists(system.app.price_bundle_path), "price bundle path does not exist");
  assert.ok(exists(system.app.stock_bundle_path), "stock bundle path does not exist");
  assert.ok(exists("apps/v9/runtime-config.js"), "runtime stock config should exist");
  assert.ok(exists(system.sync.script_path), "sync script path does not exist");

  const workflow = fs.readFileSync(path.join(process.cwd(), ".github/workflows/sync-stock.yml"), "utf8");
  assert.ok(workflow.includes("config/system.json"), "workflow should read config/system.json");
  assert.ok(workflow.includes("stock-data"), "workflow should publish stock bundle to stock-data branch");

  const netlify = fs.readFileSync(path.join(process.cwd(), "netlify.toml"), "utf8");
  assert.ok(netlify.includes('publish = "apps/v9"'), "netlify publish directory should target apps/v9");
}

try {
  run();
  console.log("path-contract: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
