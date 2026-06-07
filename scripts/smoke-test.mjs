import { spawn } from "node:child_process";

const port = 5180;
const baseUrl = `http://localhost:${port}`;

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let errorOutput = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  errorOutput += chunk.toString();
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = setInterval(async () => {
      try {
        const response = await fetch(baseUrl);
        if (response.ok) {
          clearInterval(started);
          clearTimeout(timeout);
          resolve();
        }
      } catch {
        // Keep polling until the timeout fires.
      }
    }, 150);

    const timeout = setTimeout(() => {
      clearInterval(started);
      reject(new Error(`Server did not start. stdout=${output} stderr=${errorOutput}`));
    }, 5000);
  });
}

async function expectAsset(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  const text = await response.text();
  if (expectedText && !text.includes(expectedText)) {
    throw new Error(`${path} did not include ${expectedText}`);
  }
}

async function expectContentType(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes(expectedText)) {
    throw new Error(`${path} content type was ${contentType}, expected ${expectedText}`);
  }
}

try {
  await waitForServer();
  await expectAsset("/", "LinguaFlow");
  await expectAsset("/", "dailyPathList");
  await expectAsset("/", "syncStatusLabel");
  await expectAsset("/", "reviewQueueList");
  await expectAsset("/", "desktopCalendar");
  await expectAsset("/", "mistakeList");
  await expectAsset("/", "profileStats");
  await expectAsset("/app.js", "const STORAGE_KEY");
  await expectAsset("/app.js", "renderMistakes");
  await expectAsset("/supabase-client.js", "getSupabase");
  await expectAsset("/daily-path-core.mjs", "advanceDailyPath");
  await expectAsset("/learning-core.mjs", "updateWordProgress");
  await expectAsset("/sync-client.mjs", "loadRemoteState");
  await expectAsset("/sync-core.mjs", "mergeOrDetectConflict");
  await expectContentType("/learning-core.mjs", "text/javascript");
  await expectContentType("/sync-client.mjs", "text/javascript");
  await expectAsset("/styles.css", ".mobile-nav");
  await expectAsset("/styles.css", ".dashboard-layout");
  await expectAsset("/manifest.webmanifest", "standalone");
  await expectAsset("/icons/icon.svg", "<svg");
  await expectAsset("/assets/learner-hero.svg", "<svg");
  await expectAsset("/assets/learner-avatar.svg", "<svg");
  console.log("Smoke test passed");
} finally {
  server.kill();
}
