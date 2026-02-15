const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function run() {
  const mod = await import("../tools/publish_price_bundle.mjs");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-price-"));
  const inputPath = path.join(tmpDir, "price.bundle.js");
  const outputRoot = path.join(tmpDir, "out", "apps", "v9");

  try {
    fs.mkdirSync(path.dirname(inputPath), { recursive: true });
    fs.mkdirSync(outputRoot, { recursive: true });

    const v1 = 'window.PRICE_BUNDLE = {"secured":false,"payload":"AAA","meta":{"version":"v1","rowCount":1}};\n';
    fs.writeFileSync(inputPath, v1, "utf8");

    const first = await mod.publishPriceBundle({ input: inputPath, outputRoot });
    assert.strictEqual(first.changed, true);
    assert.ok(/^[a-f0-9]{64}$/.test(first.hash), "hash should be sha256");

    const manifestPath = path.join(outputRoot, "price-manifest.json");
    assert.ok(fs.existsSync(manifestPath), "manifest should exist");
    const firstManifestRaw = fs.readFileSync(manifestPath, "utf8");
    const firstManifest = JSON.parse(firstManifestRaw);
    assert.strictEqual(firstManifest.hash, first.hash);
    assert.strictEqual(firstManifest.latest, first.latest);
    assert.ok(fs.existsSync(path.join(outputRoot, first.latest)), "hashed bundle should exist");

    const firstManifestStat = fs.statSync(manifestPath);

    const second = await mod.publishPriceBundle({ input: inputPath, outputRoot });
    assert.strictEqual(second.changed, false);
    assert.strictEqual(second.hash, first.hash);
    const secondManifestRaw = fs.readFileSync(manifestPath, "utf8");
    assert.strictEqual(secondManifestRaw, firstManifestRaw, "manifest content should be unchanged");
    const secondManifestStat = fs.statSync(manifestPath);
    assert.strictEqual(secondManifestStat.mtimeMs, firstManifestStat.mtimeMs, "manifest mtime should not change");

    const v2 = 'window.PRICE_BUNDLE = {"secured":false,"payload":"BBB","meta":{"version":"v2","rowCount":2}};\n';
    fs.writeFileSync(inputPath, v2, "utf8");
    const third = await mod.publishPriceBundle({ input: inputPath, outputRoot });
    assert.strictEqual(third.changed, true);
    assert.notStrictEqual(third.hash, first.hash, "hash should change with new bundle content");

    const thirdManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.strictEqual(thirdManifest.hash, third.hash);
    assert.strictEqual(thirdManifest.latest, third.latest);
    assert.ok(fs.existsSync(path.join(outputRoot, third.latest)), "new hashed bundle should exist");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log("publish-price-hash: OK");
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
