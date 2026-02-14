const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

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

async function run() {
  const mod = await import("../tools/sync_stock_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-stock-no-overwrite-"));
  const outPath = path.join(tmpDir, "stock.bundle.js");
  const originalFetch = global.fetch;

  global.fetch = async () =>
    jsonResponse({ byCode: { "01.01.0001": "A仓:12(正常)", "01.01.0002": "B仓:5(在途)" } });

  try {
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

    const first = await mod.syncStockBundle({ outputPath: outPath, runtime });
    assert.strictEqual(first.changed, true);
    const firstContent = fs.readFileSync(outPath, "utf8");
    const firstStat = fs.statSync(outPath);

    const second = await mod.syncStockBundle({ outputPath: outPath, runtime });
    assert.strictEqual(second.changed, false);
    assert.strictEqual(second.dataHash, first.dataHash);

    const secondContent = fs.readFileSync(outPath, "utf8");
    const secondStat = fs.statSync(outPath);
    assert.strictEqual(secondContent, firstContent, "file content should not change on unchanged data");
    assert.strictEqual(secondStat.mtimeMs, firstStat.mtimeMs, "mtime should not change on unchanged data");
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("sync-no-overwrite: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
