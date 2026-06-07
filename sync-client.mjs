import { mergeOrDetectConflict, prepareStateForRemoteSave } from "./sync-core.mjs";

const IDENTITY_URL = "https://esm.sh/@netlify/identity";

async function loadIdentity() {
  try {
    return await import(IDENTITY_URL);
  } catch {
    return null;
  }
}

export async function getIdentityUser() {
  const identity = await loadIdentity();
  if (!identity?.getUser) {
    return null;
  }
  try {
    return await identity.getUser();
  } catch {
    return null;
  }
}

export async function loginWithNetlifyIdentity(email, password, mode = "login", name = "") {
  const identity = await loadIdentity();
  if (!identity) {
    throw new Error("Netlify Identity is unavailable in this environment.");
  }
  if (identity.handleAuthCallback) {
    await identity.handleAuthCallback().catch(() => null);
  }
  return mode === "register"
    ? identity.signup(email, password, { full_name: name || email })
    : identity.login(email, password);
}

export async function logoutNetlifyIdentity() {
  const identity = await loadIdentity();
  if (identity?.logout) {
    await identity.logout();
  }
}

export async function loadRemoteState(token = "") {
  const response = await fetch("/api/learning-state", {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 401) {
    return { status: "unauthorized", state: null };
  }
  if (response.status === 404) {
    return { status: "empty", state: null };
  }
  if (!response.ok) {
    throw new Error(`Remote state request failed with ${response.status}`);
  }
  const payload = await response.json();
  return { status: payload.state ? "found" : "empty", state: payload.state || null };
}

export async function saveRemoteState(state, token = "") {
  const remoteState = prepareStateForRemoteSave(state);
  const response = await fetch("/api/learning-state", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ state: remoteState }),
  });
  if (response.status === 401) {
    return { status: "unauthorized", state };
  }
  if (!response.ok) {
    throw new Error(`Remote state save failed with ${response.status}`);
  }
  const payload = await response.json();
  return { status: "saved", state: payload.state || remoteState };
}

export function mergeRemoteState(localState, remoteState, now = new Date()) {
  return mergeOrDetectConflict(localState, remoteState, now);
}
