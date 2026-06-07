import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const config = await readFile(resolve(root, "netlify.toml"), "utf8");

assert.match(config, /^\[build\]$/m);
assert.match(config, /^command = "npm run build"$/m);
assert.match(config, /^publish = "dist"$/m);
assert.match(config, /^\[\[redirects\]\]$/m);
assert.match(config, /^from = "\/\*"$/m);
assert.match(config, /^to = "\/index.html"$/m);
assert.match(config, /^status = 200$/m);

console.log("Netlify config test passed");
