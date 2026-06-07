import { getStore } from "@netlify/blobs";
import { json, userFromRequest } from "./_shared/auth-store.mjs";

export default async function handler(request) {
  const user = await userFromRequest(request);
  if (!user?.id) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore({ name: "learning-state", consistency: "strong" });
  const key = `users/${user.id}/state.json`;

  switch (request.method) {
    case "GET": {
      const state = await store.get(key, { type: "json" });
      return json({ state: state || null });
    }
    case "PUT": {
      const body = await request.json().catch(() => ({}));
      if (!body.state || typeof body.state !== "object") {
        return json({ error: "Missing state" }, { status: 400 });
      }
      await store.setJSON(key, body.state, {
        metadata: { updatedAt: new Date().toISOString() },
      });
      return json({ state: body.state });
    }
    default:
      return json({ error: "Method not allowed" }, { status: 405 });
  }
}

export const config = {
  path: "/api/learning-state",
};
