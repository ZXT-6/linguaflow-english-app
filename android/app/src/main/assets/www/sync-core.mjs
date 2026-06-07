export function createSyncState() {
  return {
    status: "offline",
    lastSyncedAt: null,
    localUpdatedAt: null,
    remoteUpdatedAt: null,
    conflict: null,
  };
}

function comparableTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function withSyncDefaults(state) {
  return {
    ...state,
    sync: {
      ...createSyncState(),
      ...(state?.sync || {}),
    },
  };
}

export function touchLocalState(state, now = new Date()) {
  return {
    ...state,
    sync: {
      ...createSyncState(),
      ...(state?.sync || {}),
      localUpdatedAt: now.toISOString(),
      status: state?.sync?.status || "offline",
    },
  };
}

export function mergeOrDetectConflict(localState, remoteState, now = new Date()) {
  const local = withSyncDefaults(localState || {});
  if (!remoteState) {
    return {
      status: "local-only",
      state: {
        ...local,
        sync: {
          ...local.sync,
          status: "offline",
          conflict: null,
        },
      },
    };
  }

  const remote = withSyncDefaults(remoteState);
  const localUpdatedAt = comparableTime(local.sync.localUpdatedAt);
  const knownRemoteAt = comparableTime(local.sync.remoteUpdatedAt);
  const remoteUpdatedAt = comparableTime(remote.sync.remoteUpdatedAt || remote.sync.localUpdatedAt);

  if (localUpdatedAt > knownRemoteAt && remoteUpdatedAt > knownRemoteAt) {
    return {
      status: "conflict",
      state: {
        ...local,
        sync: {
          ...local.sync,
          status: "conflict",
          conflict: {
            detectedAt: now.toISOString(),
            local,
            remote,
          },
        },
      },
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      status: "remote-newer",
      state: {
        ...remote,
        sync: {
          ...remote.sync,
          status: "synced",
          lastSyncedAt: now.toISOString(),
          localUpdatedAt: remote.sync.localUpdatedAt || remote.sync.remoteUpdatedAt,
          remoteUpdatedAt: remote.sync.remoteUpdatedAt || remote.sync.localUpdatedAt,
          conflict: null,
        },
      },
    };
  }

  return {
    status: "local-newer",
    state: {
      ...local,
      sync: {
        ...local.sync,
        status: "pending",
        conflict: null,
      },
    },
  };
}

export function resolveSyncConflict(state, choice, now = new Date()) {
  const sync = state?.sync || {};
  const conflict = sync.conflict;
  if (!conflict || choice === "later") {
    return withSyncDefaults(state || {});
  }

  const selected = choice === "remote" ? conflict.remote : conflict.local;
  return {
    ...selected,
    sync: {
      ...createSyncState(),
      ...(selected.sync || {}),
      status: "pending",
      localUpdatedAt: now.toISOString(),
      conflict: null,
    },
  };
}

export function prepareStateForRemoteSave(state, now = new Date()) {
  const timestamp = now.toISOString();
  return {
    ...state,
    sync: {
      ...createSyncState(),
      ...(state?.sync || {}),
      status: "synced",
      lastSyncedAt: timestamp,
      localUpdatedAt: state?.sync?.localUpdatedAt || timestamp,
      remoteUpdatedAt: timestamp,
      conflict: null,
    },
  };
}
