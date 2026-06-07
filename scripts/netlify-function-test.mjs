import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = await readFile(resolve(root, "netlify/functions/learning-state.mjs"), "utf8");
const auth = await readFile(resolve(root, "netlify/functions/auth.mjs"), "utf8");
const admin = await readFile(resolve(root, "netlify/functions/admin.mjs"), "utf8");
const authStore = await readFile(resolve(root, "netlify/functions/_shared/auth-store.mjs"), "utf8");

assert.match(source, /from "@netlify\/blobs"/);
assert.match(source, /userFromRequest/);
assert.match(source, /getStore\(\{ name: "learning-state"/);
assert.match(source, /path: "\/api\/learning-state"/);
assert.match(source, /status: 401/);
assert.match(source, /case "GET"/);
assert.match(source, /case "PUT"/);
assert.match(source, /users\/\$\{user\.id\}\/state\.json/);
assert.doesNotMatch(source, /@netlify\/identity/);

assert.match(auth, /path:\s*\["\/api\/auth\/register", "\/api\/auth\/login"\]/);
assert.match(auth, /handleRegister/);
assert.match(auth, /handleLogin/);
assert.match(auth, /createSession/);
assert.match(auth, /verifyPassword/);
assert.match(auth, /status: 409/);

assert.match(authStore, /getStore\(\{ name: USER_STORE/);
assert.match(authStore, /getStore\(\{ name: SESSION_STORE/);
assert.match(authStore, /createPasswordHash/);
assert.match(authStore, /userFromRequest/);
assert.match(authStore, /Authorization|authorization/);

assert.match(admin, /path:\s*"\/api\/admin\/users"/);
assert.match(admin, /userFromRequest/);
assert.match(admin, /role\s*!==\s*"admin"/);
assert.match(admin, /status:\s*403/);
assert.match(admin, /usersStore/);
assert.match(admin, /getStore\(\{ name: "learning-state"/);
assert.match(admin, /store\.list\(\{ prefix: "users\/"/);
assert.match(admin, /publicUser/);
assert.match(admin, /hasState/);

console.log("Netlify function test passed");
