const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const XLSX = require("xlsx");

function createXlsxBuffer(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
}

async function run() {
  const mod = await import("../tools/sync_price_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "price-source-validation-"));
  const outPath = path.join(tmpDir, "price.bundle.js");
  const originalFetch = global.fetch;

  assert.strictEqual(mod.detectSourceKind("https://x/y", "text/html"), "html");
  assert.strictEqual(mod.detectSourceKind("https://x/price.xlsx", "application/octet-stream"), "xlsx");
  assert.strictEqual(mod.detectSourceKind("https://x/price.csv", "text/csv"), "csv");
  assert.strictEqual(mod.detectSourceKind("https://x/price.json", "application/json"), "json");

  const runtime = await mod
    .resolveRuntimeConfig({
      argv: ["--config", "config/system.json", "--price-config", "config/price-source.json"],
    })
    .catch((err) => err);
  assert.ok(
    runtime instanceof Error && runtime.message.includes("Missing price source URL"),
    "template price-source should fail without env override"
  );

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
    const htmlFail = await mod
      .syncPriceBundle({
        outputPath: outPath,
        runtime: {
          priceConfig: {
            price_source_url: "https://example.com/view-page",
            price_source_token: "",
            allowed_content_types: ["xlsx"],
            timeout_ms: 15000,
            max_bytes: 1024 * 1024,
            allowed_domains: [],
          },
          outputPath: outPath,
          mode: "plain",
          pricePassword: "",
        },
      })
      .catch((err) => err);
    assert.ok(htmlFail instanceof Error);
    assert.ok(htmlFail.message.includes("HTML page"));
  } finally {
    global.fetch = originalFetch;
  }

  const xlsxBuffer = createXlsxBuffer([
    {
      代码: "01.01.0001",
      规格型号: "WNMG080408 UC5115",
      销售单价: "100.5",
      名称: "test",
      助记码: "",
      补充说明: "remark",
      别名: "",
      特价: "",
    },
  ]);

  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name || "").toLowerCase();
        if (key === "content-type") {
          return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        if (key === "content-length") return String(xlsxBuffer.byteLength);
        return null;
      },
    },
    async arrayBuffer() {
      return xlsxBuffer.buffer.slice(
        xlsxBuffer.byteOffset,
        xlsxBuffer.byteOffset + xlsxBuffer.byteLength
      );
    },
    async text() {
      return "";
    },
  });

  try {
    const ok = await mod.syncPriceBundle({
      outputPath: outPath,
      runtime: {
        priceConfig: {
          price_source_url: "https://example.com/price.xlsx",
          price_source_token: "",
          allowed_content_types: ["xlsx"],
          timeout_ms: 15000,
          max_bytes: 5 * 1024 * 1024,
          allowed_domains: [],
        },
        outputPath: outPath,
        mode: "plain",
        pricePassword: "",
      },
    });
    assert.strictEqual(ok.changed, true);
    assert.strictEqual(ok.secured, false);
    assert.strictEqual(ok.rowCount, 1);
    assert.ok(fs.existsSync(outPath), "price bundle file should be generated");
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("price-source-validation: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
