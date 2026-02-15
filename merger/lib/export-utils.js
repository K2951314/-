(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./data-utils"), require("./bundle-utils"));
  } else {
    root.ExportUtils = factory(root.DataUtils, root.BundleUtils);
  }
})(typeof self !== "undefined" ? self : this, function (DataUtils, BundleUtils) {
  if (!DataUtils || !BundleUtils) throw new Error("DataUtils and BundleUtils are required");

  function createStockBundleScript(stockRows) {
    var rows = Array.isArray(stockRows) ? stockRows : [];
    var stockByCode = DataUtils.buildStockByCode(rows);
    var stockBundle = BundleUtils.encodeStockBundle(stockByCode);
    return {
      byCode: stockByCode,
      bundle: stockBundle,
      script: BundleUtils.toWindowScript("STOCK_BUNDLE", stockBundle),
    };
  }

  async function createPriceBundleScript(priceRows, password) {
    var rows = Array.isArray(priceRows) ? priceRows : [];
    var dataset = DataUtils.buildPriceDatasetWithDictionary(rows);
    var priceBundle = await BundleUtils.encodePriceBundle(dataset, password || "");
    return {
      bySpec: dataset.bySpec,
      strings: dataset.strings,
      bundle: priceBundle,
      script: BundleUtils.toWindowScript("PRICE_BUNDLE", priceBundle),
    };
  }

  async function createPriceShardScripts(priceRows, password, options) {
    var rows = Array.isArray(priceRows) ? priceRows : [];
    var opts = options || {};
    var fallbackBrand = String(opts.defaultBrand || "UNMAPPED").trim() || "UNMAPPED";
    var shardPrefix = String(opts.shardPrefix || "price.bundle").trim() || "price.bundle";
    var brandRows = DataUtils.splitPriceRowsByBrand(rows, fallbackBrand);
    var brands = Object.keys(brandRows).sort();
    var shards = [];

    for (var i = 0; i < brands.length; i++) {
      var brand = brands[i];
      var slug = String(brand || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unmapped";
      var filename = shardPrefix + "." + slug + ".js";
      var dataset = DataUtils.buildPriceDatasetWithDictionary(brandRows[brand]);
      var bundle = await BundleUtils.encodePriceBundle(dataset, password || "");
      shards.push({
        brand: brand,
        filename: filename,
        checksum: bundle.payload.length,
        rowCount: Object.keys(dataset.bySpec || {}).length,
        dictionarySize: (dataset.strings || []).length,
        bundle: bundle,
        script: BundleUtils.toWindowScript("PRICE_BUNDLE", bundle),
      });
    }

    return {
      version: new Date().toISOString(),
      shards: shards,
    };
  }

  function createMergedDb(priceRows, stockRows) {
    var priceDataset = DataUtils.buildPriceDataset(Array.isArray(priceRows) ? priceRows : []);
    var stockByCode = DataUtils.buildStockByCode(Array.isArray(stockRows) ? stockRows : []);
    return DataUtils.joinPriceStock(priceDataset, stockByCode);
  }

  return {
    createStockBundleScript: createStockBundleScript,
    createPriceBundleScript: createPriceBundleScript,
    createPriceShardScripts: createPriceShardScripts,
    createMergedDb: createMergedDb,
  };
});
