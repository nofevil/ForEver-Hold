import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A missing /assets file was cached for a year. Later publishes reuse the same
 * name when the file did not change, so the browser keeps the old "not found"
 * and the page never starts. Ask for each real asset with a query the cache
 * does not have.
 *
 * The query has to change every build. A fixed `?v=hold2` that 404s once is
 * cached for a year (the /assets header is immutable), and every later publish
 * that reuses it stays broken — module scripts send Origin and keep hitting
 * that cached HTML 404, so the app shell renders but sign-in never runs.
 */
const root = new URL("../", import.meta.url).pathname;
const assetsDir = join(root, ".vercel/output/static/assets");
const serverDir = join(root, ".vercel/output/functions");
const configPath = join(root, ".vercel/output/config.json");
const QUERY = `v=${Date.now().toString(36)}`;

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

// A missing /assets file falls through to the app and inherits the year-long
// asset cache header, so Cloudflare stores the HTML 404 for a year. Stop that
// miss before it reaches the server.
const config = JSON.parse(readFileSync(configPath, "utf8"));
const routes = Array.isArray(config.routes) ? config.routes : [];
const missSrc = "/assets/(.*)";
if (!routes.some((route) => route.status === 404 && route.src === missSrc)) {
  const filesystem = routes.findIndex((route) => route.handle === "filesystem");
  const miss = {
    src: missSrc,
    status: 404,
    headers: { "cache-control": "no-store" },
  };
  routes.splice(filesystem === -1 ? routes.length : filesystem + 1, 0, miss);
  config.routes = routes;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

console.log(`[assets] ${files} files now request ?${QUERY}`);
