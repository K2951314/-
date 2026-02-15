const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const runtimeConfig = fs.readFileSync(path.join(process.cwd(), "apps/v9/runtime-config.js"), "utf8");
  const index = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  const headers = fs.readFileSync(path.join(process.cwd(), "apps/v9/_headers"), "utf8");

  const versionMatch = runtimeConfig.match(/releaseVersion:\s*"([^"]+)"/);
  assert.ok(versionMatch, "runtime-config should define releaseVersion");
  const releaseVersion = versionMatch[1];

  assert.ok(runtimeConfig.includes(`stock.bundle.js?v=${releaseVersion}`), "remote stock URL should carry release version");
  assert.ok(index.includes(`runtime-config.js?v=${releaseVersion}`), "index should load versioned runtime config");
  assert.ok(index.includes(`price.bundle.js?v=${releaseVersion}`), "index should load versioned price bundle");

  assert.ok(headers.includes("/index.html\n  Cache-Control: public, max-age=0, must-revalidate"), "index should stay revalidatable");
  assert.ok(headers.includes("/runtime-config.js\n  Cache-Control: public, max-age=31536000, immutable"), "runtime-config should be immutable cache");
  assert.ok(headers.includes("/price.bundle.js\n  Cache-Control: public, max-age=31536000, immutable"), "price bundle should be immutable cache");
  assert.ok(headers.includes("/stock.bundle.js\n  Cache-Control: public, max-age=0, must-revalidate"), "local stock fallback should revalidate");
}

try {
  run();
  console.log("release-versioning: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
