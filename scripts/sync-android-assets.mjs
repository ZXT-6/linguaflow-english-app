import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = join(root, "android", "app", "src", "main", "assets", "www");

const files = [
  "index.html",
  "styles.css",
  "app-entry.js",
  "app.js",
  "supabase-client.js",
  "daily-path-core.mjs",
  "learning-core.mjs",
  "sync-client.mjs",
  "sync-core.mjs",
  "manifest.webmanifest",
  "sw.js",
  "icons/icon.svg",
  "assets/learner-hero.svg",
  "assets/learner-avatar.svg",
  "assets/study-cafe-desk.svg",
  "assets/empty-bookmark.svg",
  "assets/empty-review.svg",
  "assets/empty-notebook.svg",
  "assets/volume-d.svg",
  "assets/menu-plan-a.svg",
  "assets/menu-vocab-a.svg",
  "assets/menu-favorites-d.svg",
  "assets/menu-settings-b.svg",
  "assets/menu-about-a.svg",
  "assets/nav-home-a.svg",
  "assets/nav-vocab-b.svg",
  "assets/nav-practice-c.svg",
  "assets/nav-mistakes-a.svg",
  "assets/nav-profile-a.svg",
];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const file of files) {
  const destination = join(target, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, file), destination);
}

console.log(`Android assets synced to ${target}`);
