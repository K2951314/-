const assert = require("assert");
const DataUtils = require("../merger/lib/data-utils");

function run() {
  const rows = [
    { 代码: "A1", 规格型号: "SPEC-A", 销售单价: 10, 特价: "特价模板", 补充说明: "备注模板", brand: "OSG" },
    { 代码: "A2", 规格型号: "SPEC-B", 销售单价: 20, 特价: "特价模板", 补充说明: "备注模板", brand: "MITSU" },
  ];

  const compact = DataUtils.buildPriceDatasetWithDictionary(rows);
  assert.ok(Array.isArray(compact.strings), "dictionary should exist");
  assert.strictEqual(compact.strings.length, 2, "duplicate strings should be deduplicated");
  assert.deepStrictEqual(compact.bySpec["SPEC-A"], ["A1", 10, 0, 1]);

  const grouped = DataUtils.splitPriceRowsByBrand(rows, "UNMAPPED");
  assert.strictEqual(grouped.OSG.length, 1);
  assert.strictEqual(grouped.MITSU.length, 1);
}

try {
  run();
  console.log("price-dataset-compact: OK");
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
