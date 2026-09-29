/**
 * Nitro inlines @electric-sql/pglite but leaves its wasm/data siblings behind.
 * The bundled module loads them with `new URL("./pglite.data", import.meta.url)`,
 * so they have to sit next to the function chunk. Dev never hits this path.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = join(root, "node_modules/@electric-sql/pglite/dist");
const dest = join(root, ".vercel/output/functions/__server.func/_libs");
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

if (!existsSync(dest)) {
  console.log("[pglite] no server bundle — skipping asset copy");
  process.exit(0);
}

for (const file of files) {
  const from = join(src, file);
  if (!existsSync(from)) {
    console.error(`[pglite] missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(dest, file));
}
console.log("[pglite] copied wasm and data next to the server bundle");
