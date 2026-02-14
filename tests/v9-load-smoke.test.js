const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const html = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  assert.ok(html.includes('src="./lib/data-utils.js"'), "v9 index should load local shared utils");
  assert.ok(html.includes('src="price.bundle.js"'), "v9 index should load price bundle");
  assert.ok(html.includes('src="stock.bundle.js"'), "v9 index should load stock bundle");
  assert.ok(
    fs.existsSync(path.join(process.cwd(), "apps/v9/lib/data-utils.js")),
    "v9 local shared utils file should exist"
  );
  assert.ok(
    !html.includes("../../merger/lib/data-utils.js"),
    "cross-directory shared path should be removed for Netlify publish"
  );
}

try {
  run();
  console.log("v9-load-smoke: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
