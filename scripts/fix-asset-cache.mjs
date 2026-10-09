import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Nitro marks every `/assets/` response immutable for a year, including a miss.
 * The first request after publish can land before the file is uploaded, and
 * that "not found" is then kept for a year — the page stays unstyled even
 * after the stylesheet arrives. Remember only files that exist. A miss is
 * not stored.
 */
const root = new URL("../", import.meta.url).pathname;
const configPath = join(root, ".vercel/output/config.json");
const assetsDir = join(root, ".vercel/output/static/assets");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const overrides = { ...(config.overrides ?? {}) };
for (const name of readdirSync(assetsDir)) {
  overrides[`assets/${name}`] = {
    path: `assets/${name}`,
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  };
}

const routes = (config.routes ?? []).filter((route) => route.src !== "/assets/(.*)");
const filesystemAt = routes.findIndex((route) => route.handle === "filesystem");
const miss = {
  src: "/assets/(.*)",
  headers: { "cache-control": "no-store" },
  continue: true,
};
if (filesystemAt === -1) routes.unshift({ handle: "filesystem" }, miss);
else routes.splice(filesystemAt + 1, 0, miss);

config.overrides = overrides;
config.routes = routes;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[assets] ${Object.keys(overrides).length} files cached; a missing asset is not stored`);
