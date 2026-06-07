import assert from "node:assert/strict";
import {
  buildReviewQueue,
  calculateLearningStats,
  getMasteryLabel,
  updateWordProgress,
} from "../learning-core.mjs";

const words = [
  { word: "focus", meaning: "专注", level: "A1" },
  { word: "habit", meaning: "习惯", level: "A1" },
  { word: "progress", meaning: "进步", level: "A2" },
];

const baseTime = new Date("2026-06-02T00:00:00.000Z");

function testCorrectAnswerRaisesMastery() {
  const progress = updateWordProgress({}, "focus", true, baseTime);

  assert.equal(progress.focus.correct, 1);
  assert.equal(progress.focus.wrong, 0);
  assert.equal(progress.focus.mastery, 1);
  assert.equal(progress.focus.lastStudiedAt, baseTime.toISOString());
  assert.equal(progress.focus.nextReviewAt, "2026-06-03T00:00:00.000Z");
}

function testWrongAnswerSchedulesSoonerReview() {
  const existing = {
    focus: {
      word: "focus",
      correct: 2,
      wrong: 0,
      mastery: 2,
      lastStudiedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-04T00:00:00.000Z",
    },
  };

  const progress = updateWordProgress(existing, "focus", false, baseTime);

  assert.equal(progress.focus.correct, 2);
  assert.equal(progress.focus.wrong, 1);
  assert.equal(progress.focus.mastery, 1);
  assert.equal(progress.focus.nextReviewAt, "2026-06-02T06:00:00.000Z");
}

function testReviewQueuePrioritizesDueWords() {
  const progress = {
    focus: {
      word: "focus",
      correct: 1,
      wrong: 0,
      mastery: 1,
      lastStudiedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-02T00:00:00.000Z",
    },
    habit: {
      word: "habit",
      correct: 3,
      wrong: 0,
      mastery: 3,
      lastStudiedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-09T00:00:00.000Z",
    },
  };

  const queue = buildReviewQueue(words, progress, baseTime, 2);

  assert.deepEqual(
    queue.map((item) => item.word),
    ["focus", "progress"],
  );
  assert.equal(queue[0].status, "due");
  assert.equal(queue[1].status, "new");
}

function testStatsUseProgressRecords() {
  const progress = {
    focus: {
      word: "focus",
      correct: 4,
      wrong: 0,
      mastery: 4,
      lastStudiedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-08T00:00:00.000Z",
    },
    habit: {
      word: "habit",
      correct: 1,
      wrong: 2,
      mastery: 1,
      lastStudiedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-02T00:00:00.000Z",
    },
  };

  const stats = calculateLearningStats(words, progress, [{ correct: true }, { correct: false }, { correct: true }], baseTime);

  assert.equal(stats.totalWords, 3);
  assert.equal(stats.studiedWords, 2);
  assert.equal(stats.masteredWords, 1);
  assert.equal(stats.dueReviews, 1);
  assert.equal(stats.accuracy, 67);
}

function testMasteryLabels() {
  assert.equal(getMasteryLabel(0), "新词");
  assert.equal(getMasteryLabel(1), "初学");
  assert.equal(getMasteryLabel(2), "复习中");
  assert.equal(getMasteryLabel(4), "已掌握");
}

for (const test of [
  testCorrectAnswerRaisesMastery,
  testWrongAnswerSchedulesSoonerReview,
  testReviewQueuePrioritizesDueWords,
  testStatsUseProgressRecords,
  testMasteryLabels,
]) {
  test();
}

console.log("Learning core tests passed");
