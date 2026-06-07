import { cp, mkdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");

const publishAssets = [
  "index.html",
  "app-entry.js",
  "app.js",
  "supabase-client.js",
  "daily-path-core.mjs",
  "styles.css",
  "learning-core.mjs",
  "sync-client.mjs",
  "sync-core.mjs",
  "sw.js",
  "manifest.webmanifest",
  "assets",
  "icons",
];

function assertInsideRoot(path) {
  const relativePath = relative(root, path);
  if (relativePath === "" || relativePath.startsWith("..")) {
    throw new Error(`Unexpected path outside project root: ${path}`);
  }
}

assertInsideRoot(dist);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const asset of publishAssets) {
  await cp(join(root, asset), join(dist, asset), { recursive: true });
}

console.log(`Built static deployment assets in ${relative(root, dist)}`);
