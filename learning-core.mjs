const REVIEW_INTERVALS_HOURS = [0, 24, 72, 168, 336, 720];
const WRONG_REVIEW_HOURS = 6;

function normalizeKey(word) {
  return String(word || "").trim().toLowerCase();
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function safeProgress(progress) {
  return progress && typeof progress === "object" ? progress : {};
}

export function updateWordProgress(progress, word, correct, now = new Date()) {
  const key = normalizeKey(word);
  if (!key) {
    return safeProgress(progress);
  }

  const previous = safeProgress(progress)[key] || {
    word: key,
    correct: 0,
    wrong: 0,
    mastery: 0,
    lastStudiedAt: null,
    nextReviewAt: null,
  };

  const mastery = correct ? Math.min(5, Number(previous.mastery || 0) + 1) : Math.max(0, Number(previous.mastery || 0) - 1);
  const intervalHours = correct ? REVIEW_INTERVALS_HOURS[mastery] || REVIEW_INTERVALS_HOURS.at(-1) : WRONG_REVIEW_HOURS;

  return {
    ...safeProgress(progress),
    [key]: {
      word: previous.word || key,
      correct: Number(previous.correct || 0) + (correct ? 1 : 0),
      wrong: Number(previous.wrong || 0) + (correct ? 0 : 1),
      mastery,
      lastStudiedAt: now.toISOString(),
      nextReviewAt: addHours(now, intervalHours).toISOString(),
    },
  };
}

export function buildReviewQueue(words, progress, now = new Date(), limit = 5) {
  const records = safeProgress(progress);
  const time = now.getTime();

  return [...words]
    .map((word) => {
      const key = normalizeKey(word.word);
      const record = records[key];
      const nextReviewTime = record?.nextReviewAt ? new Date(record.nextReviewAt).getTime() : 0;
      const status = !record ? "new" : nextReviewTime <= time ? "due" : "scheduled";
      const priority = status === "due" ? 0 : status === "new" ? 1 : 2;

      return {
        ...word,
        progress: record || null,
        mastery: Number(record?.mastery || 0),
        status,
        nextReviewAt: record?.nextReviewAt || null,
        priority,
      };
    })
    .filter((item) => item.status !== "scheduled")
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return String(a.nextReviewAt || "").localeCompare(String(b.nextReviewAt || ""));
    })
    .slice(0, limit);
}

export function calculateLearningStats(words, progress, answers = [], now = new Date()) {
  const records = Object.values(safeProgress(progress));
  const dueReviews = records.filter((record) => record.nextReviewAt && new Date(record.nextReviewAt).getTime() <= now.getTime()).length;
  const validAnswers = Array.isArray(answers) ? answers : [];
  const correctAnswers = validAnswers.filter((answer) => (typeof answer === "boolean" ? answer : answer?.correct)).length;

  return {
    totalWords: words.length,
    studiedWords: records.length,
    masteredWords: records.filter((record) => Number(record.mastery || 0) >= 4).length,
    dueReviews,
    accuracy: validAnswers.length ? Math.round((correctAnswers / validAnswers.length) * 100) : 0,
  };
}

export function getMasteryLabel(mastery = 0) {
  if (mastery >= 4) {
    return "已掌握";
  }
  if (mastery >= 2) {
    return "复习中";
  }
  if (mastery >= 1) {
    return "初学";
  }
  return "新词";
}
