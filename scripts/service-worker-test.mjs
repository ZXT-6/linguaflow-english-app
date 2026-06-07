import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = await readFile(resolve(root, "sw.js"), "utf8");

assert.match(source, /self\.skipWaiting\(\)/);
assert.match(source, /self\.clients\.claim\(\)/);
assert.match(source, /fetch\(event\.request\)/);
assert.match(source, /cache\.put\(event\.request,\s*response\.clone\(\)\)/);
assert.match(source, /caches\.match\(event\.request\)/);

console.log("Service worker test passed");
