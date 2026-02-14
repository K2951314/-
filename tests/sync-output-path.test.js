const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

function makeResponse(bodyText, contentType) {
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (key === "content-type") return contentType;
        if (key === "content-length") return String(Buffer.byteLength(bodyText));
        return null;
      },
    },
    async text() {
      return bodyText;
    },
    async arrayBuffer() {
      return Buffer.from(bodyText).buffer;
    },
  };
}

async function run() {
  const mod = await import("../tools/sync_stock_bundle.mjs");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-stock-"));
  const outPath = path.join(tmpDir, "stock.bundle.js");
  const originalFetch = global.fetch;
  global.fetch = async () =>
    makeResponse(
      JSON.stringify({ byCode: { "01.01.0001": "A仓:12(正常)" } }),
      "application/json"
    );

  try {
    const result = await mod.syncStockBundle({
      outputPath: outPath,
      runtime: {
        stockConfig: {
          stock_source_url: "https://example.com/stock.json",
          stock_source_token: "",
          allowed_content_types: ["json", "csv", "xlsx", "js"],
          timeout_ms: 15000,
          max_bytes: 5 * 1024 * 1024,
          allowed_domains: [],
        },
        outputPath: outPath,
      },
    });

    assert.strictEqual(result.outputPath, outPath);
    assert.strictEqual(result.kind, "json");
    assert.strictEqual(result.changed, true);
    assert.ok(/^[a-f0-9]{64}$/.test(result.dataHash), "dataHash should be sha256");
    assert.ok(fs.existsSync(outPath), "output stock bundle should exist");
    const script = fs.readFileSync(outPath, "utf8");
    assert.ok(script.includes("window.STOCK_BUNDLE"), "output should define STOCK_BUNDLE");
    assert.ok(script.includes("\"source\":\"https://example.com/stock.json\""));
    assert.ok(script.includes("\"generated_at\""));
    assert.ok(script.includes("\"data_hash\""));
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("sync-output-path: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
