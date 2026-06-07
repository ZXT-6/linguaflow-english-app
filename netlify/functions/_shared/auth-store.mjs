import { randomBytes, createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

const USER_STORE = "linguaflow-users";
const SESSION_STORE = "linguaflow-sessions";

export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function createPasswordHash(password, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: hashValue(`${salt}:${password}`),
  };
}

export function verifyPassword(password, passwordRecord = {}) {
  if (!passwordRecord.salt || !passwordRecord.hash) {
    return false;
  }
  return createPasswordHash(password, passwordRecord.salt).hash === passwordRecord.hash;
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || "learner",
    createdAt: user.createdAt,
  };
}

export async function usersStore() {
  return getStore({ name: USER_STORE, consistency: "strong" });
}

export async function sessionsStore() {
  return getStore({ name: SESSION_STORE, consistency: "strong" });
}

export async function getUserByIdentifier(identifier) {
  const store = await usersStore();
  const key = normalizeIdentifier(identifier);
  if (!key) {
    return null;
  }
  const index = await store.get(`indexes/${key}.json`, { type: "json" });
  if (!index?.userId) {
    return null;
  }
  return store.get(`users/${index.userId}.json`, { type: "json" });
}

export async function saveUser(user) {
  const store = await usersStore();
  await store.setJSON(`users/${user.id}.json`, user);
  await store.setJSON(`indexes/${normalizeIdentifier(user.username)}.json`, { userId: user.id });
  await store.setJSON(`indexes/${normalizeIdentifier(user.email)}.json`, { userId: user.id });
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashValue(token);
  const store = await sessionsStore();
  await store.setJSON(`tokens/${tokenHash}.json`, {
    userId,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export async function userFromRequest(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return null;
  }
  const session = await (await sessionsStore()).get(`tokens/${hashValue(token)}.json`, { type: "json" });
  if (!session?.userId) {
    return null;
  }
  return (await usersStore()).get(`users/${session.userId}.json`, { type: "json" });
}
