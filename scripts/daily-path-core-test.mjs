import assert from "node:assert/strict";
import {
  DAILY_PATH_STEPS,
  advanceDailyPath,
  createDailyPath,
  getActivePathStep,
  recordPathProgress,
} from "../daily-path-core.mjs";

const day = "2026-06-03";

{
  const path = createDailyPath(day);
  assert.equal(path.day, day);
  assert.equal(path.currentStep, "review");
  assert.equal(path.steps.length, DAILY_PATH_STEPS.length);
  assert.equal(getActivePathStep(path).id, "review");
  assert.equal(path.steps[0].status, "active");
  assert.equal(path.steps[1].status, "pending");
}

{
  const path = createDailyPath(day);
  const progressed = recordPathProgress(path, "review", 8, new Date("2026-06-03T08:00:00.000Z"));
  const advanced = advanceDailyPath(progressed, new Date("2026-06-03T08:01:00.000Z"));

  assert.equal(advanced.steps[0].status, "done");
  assert.equal(advanced.steps[0].completedAt, "2026-06-03T08:00:00.000Z");
  assert.equal(advanced.currentStep, "newWords");
  assert.equal(getActivePathStep(advanced).id, "newWords");
  assert.equal(advanced.steps[1].status, "active");
}

{
  let path = createDailyPath(day);
  for (const step of DAILY_PATH_STEPS) {
    path = recordPathProgress(path, step.id, step.target, new Date("2026-06-03T09:00:00.000Z"));
    path = advanceDailyPath(path, new Date("2026-06-03T09:01:00.000Z"));
  }

  assert.equal(path.currentStep, null);
  assert.equal(path.completedAt, "2026-06-03T09:01:00.000Z");
  assert.equal(path.steps.every((step) => step.status === "done"), true);
}

console.log("Daily path core tests passed");
