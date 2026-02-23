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
  const mod = await import("../tools/sync_price_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-price-no-overwrite-"));
  const outPath = path.join(tmpDir, "price.bundle.js");
  const originalFetch = global.fetch;

  global.fetch = async () =>
    jsonResponse([
      {
        代码: "01.01.0001",
        规格型号: "WNMG080408 UC5115",
        销售单价: "100",
        名称: "",
        助记码: "",
        补充说明: "remark",
        别名: "",
        特价: "",
      },
    ]);

  try {
    const runtime = {
      priceConfig: {
        price_source_url: "https://example.com/price.json",
        price_source_token: "",
        allowed_content_types: ["json"],
        timeout_ms: 15000,
        max_bytes: 5 * 1024 * 1024,
        allowed_domains: [],
      },
      outputPath: outPath,
      mode: "plain",
      pricePassword: "",
    };

    const first = await mod.syncPriceBundle({ outputPath: outPath, runtime });
    assert.strictEqual(first.changed, true);
    const firstContent = fs.readFileSync(outPath, "utf8");
    const firstStat = fs.statSync(outPath);

    const second = await mod.syncPriceBundle({ outputPath: outPath, runtime });
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
    console.log("sync-price-no-overwrite: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
