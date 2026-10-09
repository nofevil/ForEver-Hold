import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

config.overrides = overrides;
config.routes = [
  { handle: "filesystem" },
  {
    src: "/assets/(.*)",
    headers: { "cache-control": "no-store" },
    continue: true,
  },
  { src: "/(.*)", dest: "/__server" },
];

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[assets] ${Object.keys(overrides).length} files cached; a missing asset is not cached`);
