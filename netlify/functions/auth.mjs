import { randomUUID } from "node:crypto";
import {
  createPasswordHash,
  createSession,
  getUserByIdentifier,
  json,
  normalizeIdentifier,
  publicUser,
  saveUser,
  verifyPassword,
} from "./_shared/auth-store.mjs";

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

async function readBody(request) {
  return request.json().catch(() => ({}));
}

async function handleRegister(request) {
  const body = await readBody(request);
  const username = String(body.username || "").trim();
  const email = normalizeIdentifier(body.email);
  const password = String(body.password || "");

  if (username.length < 2 || !validEmail(email) || password.length < 6) {
    return json({ error: "请填写用户名、有效邮箱和至少 6 位密码。" }, { status: 400 });
  }
  if (await getUserByIdentifier(username) || await getUserByIdentifier(email)) {
    return json({ error: "这个账号已经注册过，请直接登录。" }, { status: 409 });
  }

  const user = {
    id: randomUUID(),
    username,
    email,
    role: username.toLowerCase().includes("admin") ? "admin" : "learner",
    password: createPasswordHash(password),
    createdAt: new Date().toISOString(),
  };
  await saveUser(user);
  const token = await createSession(user.id);
  return json({ token, user: publicUser(user) });
}

async function handleLogin(request) {
  const body = await readBody(request);
  const identifier = body.email || body.username;
  const password = String(body.password || "");
  const user = await getUserByIdentifier(identifier);

  if (!user || !verifyPassword(password, user.password)) {
    return json({ error: "账号或密码不正确。" }, { status: 401 });
  }

  const token = await createSession(user.id);
  return json({ token, user: publicUser(user) });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  if (url.pathname.endsWith("/register")) {
    return handleRegister(request);
  }
  if (url.pathname.endsWith("/login")) {
    return handleLogin(request);
  }
  return json({ error: "Not found" }, { status: 404 });
}

export const config = {
  path: ["/api/auth/register", "/api/auth/login"],
};
