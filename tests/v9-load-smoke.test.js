const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const html = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  assert.ok(html.includes('src="runtime-config.js?v='), "v9 index should load versioned runtime-config.js");
  assert.ok(html.includes('src="price.bundle.js?v='), "v9 index should load versioned price bundle");
  assert.ok(!html.includes('src="stock.bundle.js"'), "v9 index should not eagerly load local stock bundle");
  assert.ok(
    !html.includes("data-utils.js"),
    "v9 index should not depend on data-utils.js after local-stock-only simplification"
  );
  assert.ok(!html.includes('id="stockBundleUrl"'), "v9 index should not expose stock URL input");
  assert.ok(!html.includes("applyStockSource"), "v9 index should not expose remote stock apply action");
  assert.ok(html.includes("loadStockBundleByScript"), "v9 index should include dynamic stock script loader");
}

try {
  run();
  console.log("v9-load-smoke: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
