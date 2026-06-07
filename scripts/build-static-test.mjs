import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const buildCommand = process.platform === "win32"
  ? { command: "cmd.exe", args: ["/d", "/s", "/c", "npm.cmd", "run", "build"] }
  : { command: "npm", args: ["run", "build"] };

function removeDist() {
  const relativeDist = relative(root, dist);
  if (relativeDist.startsWith("..") || relativeDist === "") {
    throw new Error(`Refusing to remove unexpected dist path: ${dist}`);
  }
  rmSync(dist, { recursive: true, force: true });
}

removeDist();

try {
  const result = spawnSync(buildCommand.command, buildCommand.args, {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `npm run build failed\nerror:\n${result.error || ""}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  for (const asset of [
    "index.html",
    "app.js",
    "daily-path-core.mjs",
    "styles.css",
    "learning-core.mjs",
    "sync-client.mjs",
    "sync-core.mjs",
    "sw.js",
    "manifest.webmanifest",
    "icons/icon.svg",
    "assets/learner-hero.svg",
    "assets/learner-avatar.svg",
  ]) {
    assert.equal(existsSync(join(dist, asset)), true, `${asset} should be copied to dist`);
  }

  const html = await readFile(join(dist, "index.html"), "utf8");
  assert.match(html, /LinguaFlow/);
  assert.match(html, /dailyPathList/);
  assert.match(html, /syncStatusLabel/);

  const topLevel = await readdir(dist);
  for (const excluded of ["android", "docs", "scripts", ".git", "server.mjs", "README.md"]) {
    assert.equal(topLevel.includes(excluded), false, `${excluded} should not be published`);
  }
} finally {
  removeDist();
}

console.log("Static build test passed");
