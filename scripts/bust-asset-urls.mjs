import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A missing /assets file was cached for a year. Later publishes reuse the same
 * name when the file did not change, so the browser keeps the old "not found"
 * and the page never starts. Ask for each real asset with a query the cache
 * does not have.
 */
const root = new URL("../", import.meta.url).pathname;
const assetsDir = join(root, ".vercel/output/static/assets");
const serverDir = join(root, ".vercel/output/functions");
const QUERY = "v=hold2";

const names = readdirSync(assetsDir).filter((name) => /\.(?:js|css)$/.test(name));
const pattern = new RegExp(
  `((?:\\./|/assets/|(?<![\\w./])assets/)(?:${names
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")}))(?!\\?)`,
  "g",
);

function bust(text) {
  return text.replace(pattern, `$1?${QUERY}`);
}

let files = 0;
for (const name of names) {
  if (!name.endsWith(".js")) continue;
  const path = join(assetsDir, name);
  const next = bust(readFileSync(path, "utf8"));
  if (next !== readFileSync(path, "utf8")) {
    writeFileSync(path, next);
    files += 1;
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.name.endsWith(".mjs") && !entry.name.endsWith(".js")) continue;
    const text = readFileSync(path, "utf8");
    if (!text.includes("/assets/")) continue;
    const next = text.replace(
      new RegExp(
        `(/assets/(?:${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))(?!\\?)`,
        "g",
      ),
      `$1?${QUERY}`,
    );
    if (next !== text) {
      writeFileSync(path, next);
      files += 1;
    }
  }
}

walk(serverDir);
console.log(`[assets] ${files} files now request ?${QUERY}`);
