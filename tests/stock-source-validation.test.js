const assert = require("assert");

async function run() {
  const mod = await import("../tools/sync_stock_bundle.mjs");

  assert.strictEqual(mod.detectSourceKind("https://x/y", "text/html"), "html");
  assert.strictEqual(mod.detectSourceKind("https://x/stock.csv", "text/plain"), "csv");
  assert.strictEqual(mod.detectSourceKind("https://x/a.json", "application/json"), "json");
  assert.strictEqual(mod.detectSourceKind("https://x/a.xlsx", "application/octet-stream"), "xlsx");
  assert.strictEqual(mod.detectSourceKind("https://x/a.js", "text/javascript"), "js");

  const csv = [
    "物料长代码,发料仓库,库存数量,参考状态",
    "A001,A仓,12,正常",
    "A001,B仓,0,",
    "B002,C仓,3,在途",
  ].join("\n");
  const rows = mod.parseCsvRows(csv);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0]["物料长代码"], "A001");

  const runtime = await mod.resolveRuntimeConfig({
    argv: ["--config", "config/system.json", "--stock-config", "config/stock-source.json"],
  }).catch((err) => err);
  assert.ok(
    runtime instanceof Error && runtime.message.includes("Missing stock source URL"),
    "template stock-source should fail without env override"
  );

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (key === "content-type") return "text/html";
        if (key === "content-length") return "128";
        return null;
      },
    },
    async text() {
      return "<html></html>";
    },
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    },
  });
  try {
    const fail = await mod.syncStockBundle({
      outputPath: "apps/v9/stock.bundle.js",
      runtime: {
        stockConfig: {
          stock_source_url: "https://www.kdocs.cn/l/cmBZpnKCS5EU",
          stock_source_token: "",
          allowed_content_types: ["json", "csv", "xlsx", "js"],
          timeout_ms: 15000,
          max_bytes: 1024 * 1024,
          allowed_domains: [],
        },
        outputPath: "apps/v9/stock.bundle.js",
      },
    }).catch((err) => err);
    assert.ok(fail instanceof Error);
    assert.ok(fail.message.includes("HTML page"));
  } finally {
    global.fetch = originalFetch;
  }
}

run()
  .then(() => {
    console.log("stock-source-validation: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
