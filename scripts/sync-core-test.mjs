import assert from "node:assert/strict";
import {
  createSyncState,
  mergeOrDetectConflict,
  prepareStateForRemoteSave,
  resolveSyncConflict,
} from "../sync-core.mjs";

{
  const sync = createSyncState();
  assert.equal(sync.status, "offline");
  assert.equal(sync.conflict, null);
  assert.equal(sync.lastSyncedAt, null);
}

{
  const localState = {
    minutes: 10,
    sync: { localUpdatedAt: "2026-06-03T08:00:00.000Z", remoteUpdatedAt: null },
  };
  const remoteState = null;

  const result = mergeOrDetectConflict(localState, remoteState);
  assert.equal(result.status, "local-only");
  assert.equal(result.state.minutes, 10);
}

{
  const localState = {
    minutes: 15,
    sync: {
      localUpdatedAt: "2026-06-03T09:00:00.000Z",
      remoteUpdatedAt: "2026-06-03T07:00:00.000Z",
    },
  };
  const remoteState = {
    minutes: 20,
    sync: {
      localUpdatedAt: "2026-06-03T08:30:00.000Z",
      remoteUpdatedAt: "2026-06-03T08:30:00.000Z",
    },
  };

  const result = mergeOrDetectConflict(localState, remoteState);
  assert.equal(result.status, "conflict");
  assert.equal(result.state.sync.conflict.local.minutes, 15);
  assert.equal(result.state.sync.conflict.remote.minutes, 20);
}

{
  const conflicted = {
    minutes: 15,
    sync: {
      conflict: {
        detectedAt: "2026-06-03T09:05:00.000Z",
        local: { minutes: 15 },
        remote: { minutes: 20 },
      },
    },
  };

  const resolved = resolveSyncConflict(conflicted, "remote", new Date("2026-06-03T09:06:00.000Z"));
  assert.equal(resolved.minutes, 20);
  assert.equal(resolved.sync.conflict, null);
  assert.equal(resolved.sync.localUpdatedAt, "2026-06-03T09:06:00.000Z");
}

{
  const state = prepareStateForRemoteSave(
    { minutes: 12, sync: { conflict: { local: {}, remote: {} } } },
    new Date("2026-06-03T10:00:00.000Z"),
  );
  assert.equal(state.sync.conflict, null);
  assert.equal(state.sync.remoteUpdatedAt, "2026-06-03T10:00:00.000Z");
}

console.log("Sync core tests passed");
