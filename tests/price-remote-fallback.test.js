const assert = require("assert");
const fs = require("fs");
const path = require("path");

function run() {
  const html = fs.readFileSync(path.join(process.cwd(), "apps/v9/index.html"), "utf8");
  const runtimeConfig = fs.readFileSync(path.join(process.cwd(), "apps/v9/runtime-config.js"), "utf8");

  assert.ok(html.includes("loadRemotePriceFromManifest"), "should include remote price manifest loader");
  assert.ok(html.includes("loadLocalPriceFallback"), "should include local price fallback loader");
  assert.ok(html.includes("远程价格失败，已回退本地"), "should notify fallback when remote price fails");

  assert.ok(runtimeConfig.includes("remotePrice"), "runtime config should define remotePrice section");
  assert.ok(runtimeConfig.includes("price-manifest.json"), "remotePrice should point to manifest URL");
}

try {
  run();
  console.log("price-remote-fallback: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
