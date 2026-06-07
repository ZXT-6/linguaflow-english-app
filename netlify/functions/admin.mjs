import { getStore } from "@netlify/blobs";
import { json, publicUser, userFromRequest, usersStore } from "./_shared/auth-store.mjs";

async function readLearningSummary(userId) {
  const store = getStore({ name: "learning-state", consistency: "strong" });
  const state = await store.get(`users/${userId}/state.json`, { type: "json" });
  return {
    hasState: Boolean(state),
    minutes: Number(state?.minutes || 0),
    wordsLearned: Number(state?.wordsLearned || 0),
    streak: Number(state?.streak || 0),
    updatedAt: state?.sync?.lastSyncedAt || state?.updatedAt || null,
  };
}

async function listUsers() {
  const store = await usersStore();
  const { blobs } = await store.list({ prefix: "users/" });
  const users = await Promise.all(
    blobs
      .filter((blob) => blob.key.endsWith(".json"))
      .map(async (blob) => store.get(blob.key, { type: "json" }))
  );
  const visibleUsers = users.filter((user) => user?.id);
  const rows = await Promise.all(
    visibleUsers.map(async (user) => ({
      ...publicUser(user),
      ...(await readLearningSummary(user.id)),
    }))
  );
  return rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await userFromRequest(request);
  if (!user?.id) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsers();
  return json({ users });
}

export const config = {
  path: "/api/admin/users",
};
