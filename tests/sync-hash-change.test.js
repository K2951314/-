const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

function jsonResponse(data) {
  const bodyText = JSON.stringify(data);
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (key === "content-type") return "application/json";
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

function readBundleMeta(scriptText) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(scriptText, sandbox, { timeout: 3000 });
  const bundle = sandbox.window.STOCK_BUNDLE;
  return (bundle && bundle.meta) || {};
}

async function run() {
  const mod = await import("../tools/sync_stock_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-stock-hash-change-"));
  const outPath = path.join(tmpDir, "stock.bundle.js");
  const originalFetch = global.fetch;

  const runtime = {
    stockConfig: {
      stock_source_url: "https://example.com/stock.json",
      stock_source_token: "",
      allowed_content_types: ["json", "csv", "xlsx", "js"],
      timeout_ms: 15000,
      max_bytes: 5 * 1024 * 1024,
      allowed_domains: [],
    },
    outputPath: outPath,
  };

  try {
    global.fetch = async () => jsonResponse({ byCode: { "01.01.0001": "A仓:12(正常)" } });
    const first = await mod.syncStockBundle({ outputPath: outPath, runtime });
    assert.strictEqual(first.changed, true);
    const firstMeta = readBundleMeta(fs.readFileSync(outPath, "utf8"));
    assert.strictEqual(firstMeta.data_hash, first.dataHash);

    global.fetch = async () =>
      jsonResponse({ byCode: { "01.01.0001": "A仓:13(正常)", "01.01.0002": "B仓:2(在途)" } });
    const second = await mod.syncStockBundle({ outputPath: outPath, runtime });
    assert.strictEqual(second.changed, true);
    assert.notStrictEqual(second.dataHash, first.dataHash, "hash should change when stock content changes");
    const secondMeta = readBundleMeta(fs.readFileSync(outPath, "utf8"));
    assert.strictEqual(secondMeta.data_hash, second.dataHash);
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("sync-hash-change: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
