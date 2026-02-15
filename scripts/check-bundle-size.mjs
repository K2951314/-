import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const limits = {
  "apps/v9/price.bundle.js": 13 * 1024 * 1024,
  "apps/v9/stock.bundle.js": 900 * 1024,
};

let failed = false;
for (const [rel, maxBytes] of Object.entries(limits)) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`[size-check] skip missing file: ${rel}`);
    continue;
  }
  const size = fs.statSync(abs).size;
  const kb = (size / 1024).toFixed(1);
  const limitKb = (maxBytes / 1024).toFixed(1);
  if (size > maxBytes) {
    console.error(`[size-check] FAIL ${rel}: ${kb}KB > ${limitKb}KB`);
    failed = true;
  } else {
    console.log(`[size-check] OK ${rel}: ${kb}KB <= ${limitKb}KB`);
  }
}

if (failed) process.exit(1);
