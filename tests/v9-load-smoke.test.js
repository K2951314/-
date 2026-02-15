const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const html = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  const cfg = fs.readFileSync(path.join(process.cwd(), "apps/v9/runtime-config.js"), "utf8");
  assert.ok(html.includes('src="runtime-config.js"'), "v9 index should load runtime-config.js");
  assert.ok(!html.includes('src="price.bundle.js"'), "v9 index should not eagerly load price bundle");
  assert.ok(!html.includes('src="stock.bundle.js"'), "v9 index should not eagerly load local stock bundle");
  assert.ok(html.includes("loadPriceBundleByScript"), "v9 index should include dynamic price script loader");
  assert.ok(html.includes("ensurePriceShardsForQuery"), "v9 index should support query-driven shard load");
  assert.ok(html.includes("normalizePriceDataset"), "v9 index should decode compact dictionary payload");
  assert.ok(cfg.includes("priceShards"), "runtime config should define price shard manifest");
  assert.ok(cfg.includes("checksum"), "price shard manifest should contain checksum field");
}

try {
  run();
  console.log("v9-load-smoke: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
