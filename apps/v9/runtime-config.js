window.APP_CONFIG = {
  priceShards: {
    enabled: false,
    version: "2026-02-15",
    timeoutMs: 8000,
    preload: ["price.bundle.general.js"],
    shards: [
      { brand: "GENERAL", path: "price.bundle.general.js", checksum: "pending", keywords: ["", "CARBIDE"] },
      { brand: "MITSUBISHI", path: "price.bundle.mitsubishi.js", checksum: "pending", keywords: ["MITSU", "三菱", "MMC"] },
      { brand: "OSG", path: "price.bundle.osg.js", checksum: "pending", keywords: ["OSG"] }
    ]
  },
  remoteStock: {
    enabled: true,
    url: "https://cdn.jsdelivr.net/gh/K2951314/-@stock-data/apps/v9/stock.bundle.js",
    timeoutMs: 8000,
    cacheBust: "daily",
  },
};
