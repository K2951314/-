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

function readBundle(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(text, sandbox, { timeout: 3000 });
  return sandbox.window.PRICE_BUNDLE || sandbox.PRICE_BUNDLE;
}

async function run() {
  const mod = await import("../tools/sync_price_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-price-mode-"));
  const outEncrypted = path.join(tmpDir, "price-encrypted.bundle.js");
  const outPlain = path.join(tmpDir, "price-plain.bundle.js");
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
    const missingPasswordErr = await mod
      .syncPriceBundle({
        outputPath: outEncrypted,
        runtime: {
          priceConfig: {
            price_source_url: "https://example.com/price.json",
            price_source_token: "",
            allowed_content_types: ["json"],
            timeout_ms: 15000,
            max_bytes: 5 * 1024 * 1024,
            allowed_domains: [],
          },
          outputPath: outEncrypted,
          mode: "encrypted",
          pricePassword: "",
        },
      })
      .catch((err) => err);
    assert.ok(missingPasswordErr instanceof Error);
    assert.ok(missingPasswordErr.message.includes("PRICE_BUNDLE_PASSWORD"));

    const encrypted = await mod.syncPriceBundle({
      outputPath: outEncrypted,
      runtime: {
        priceConfig: {
          price_source_url: "https://example.com/price.json",
          price_source_token: "",
          allowed_content_types: ["json"],
          timeout_ms: 15000,
          max_bytes: 5 * 1024 * 1024,
          allowed_domains: [],
        },
        outputPath: outEncrypted,
        mode: "encrypted",
        pricePassword: "abc123",
      },
    });
    assert.strictEqual(encrypted.changed, true);
    assert.strictEqual(encrypted.secured, true);
    const encryptedBundle = readBundle(outEncrypted);
    assert.strictEqual(encryptedBundle.secured, true);

    const plain = await mod.syncPriceBundle({
      outputPath: outPlain,
      runtime: {
        priceConfig: {
          price_source_url: "https://example.com/price.json",
          price_source_token: "",
          allowed_content_types: ["json"],
          timeout_ms: 15000,
          max_bytes: 5 * 1024 * 1024,
          allowed_domains: [],
        },
        outputPath: outPlain,
        mode: "plain",
        pricePassword: "",
      },
    });
    assert.strictEqual(plain.changed, true);
    assert.strictEqual(plain.secured, false);
    const plainBundle = readBundle(outPlain);
    assert.strictEqual(plainBundle.secured, false);
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("sync-price-encryption-mode: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
