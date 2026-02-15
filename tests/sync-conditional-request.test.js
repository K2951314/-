const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

function jsonResponse(data, headersOverride) {
  const bodyText = JSON.stringify(data);
  const extra = headersOverride || {};
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (Object.prototype.hasOwnProperty.call(extra, key)) return extra[key];
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

function notModifiedResponse() {
  return {
    ok: false,
    status: 304,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (key === "content-type") return "";
        return null;
      },
    },
    async text() {
      return "";
    },
    async arrayBuffer() {
      return new Uint8Array().buffer;
    },
  };
}

async function run() {
  const mod = await import("../tools/sync_stock_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-stock-conditional-"));
  const outPath = path.join(tmpDir, "stock.bundle.js");
  const originalFetch = global.fetch;

  let requestCount = 0;
  let seenIfNoneMatch = "";
  let seenIfModifiedSince = "";

  global.fetch = async (_url, options) => {
    requestCount += 1;
    if (requestCount === 1) {
      return jsonResponse(
        { byCode: { "01.01.0001": "A仓:12(正常)" } },
        { etag: '"etag-v1"', "last-modified": "Wed, 21 Oct 2015 07:28:00 GMT" }
      );
    }

    const headers = (options && options.headers) || {};
    seenIfNoneMatch = headers["If-None-Match"] || headers["if-none-match"] || "";
    seenIfModifiedSince = headers["If-Modified-Since"] || headers["if-modified-since"] || "";
    return notModifiedResponse();
  };

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
    assert.strictEqual(second.kind, "not_modified");
    assert.strictEqual(second.dataHash, first.dataHash);
    assert.ok(seenIfNoneMatch, "should send If-None-Match on second request");
    assert.ok(seenIfModifiedSince, "should send If-Modified-Since on second request");

    const secondContent = fs.readFileSync(outPath, "utf8");
    const secondStat = fs.statSync(outPath);
    assert.strictEqual(secondContent, firstContent, "304 should keep stock bundle file unchanged");
    assert.strictEqual(secondStat.mtimeMs, firstStat.mtimeMs, "304 should not rewrite output");
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("sync-conditional-request: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
