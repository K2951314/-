const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const html = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  assert.ok(html.includes("async function doSearch()"), "doSearch should be async for lazy load");
  assert.ok(html.includes("await ensurePriceLoaded()"), "doSearch should await lazy price load");
  assert.ok(html.includes("setSearchLoading(true)"), "lazy load should show loading state");
  assert.ok(html.includes("g_PriceReady"), "price load should be cached in memory");
}

try {
  run();
  console.log("price-lazy-load: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
