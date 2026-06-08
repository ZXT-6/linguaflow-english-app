export const DAILY_PATH_STEPS = [
  { id: "review", title: "到期复习", target: 8, view: "practice" },
  { id: "newWords", title: "新词学习", target: 10, view: "vocabulary" },
  { id: "dictation", title: "听写训练", target: 4, view: "listening" },
  { id: "speaking", title: "口语跟读", target: 4, view: "speaking" },
];

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function cloneStepTemplate(step, index) {
  return {
    id: step.id,
    title: step.title,
    target: step.target,
    progress: 0,
    status: index === 0 ? "active" : "pending",
    completedAt: null,
  };
}

export function createDailyPath(day = isoDay()) {
  return {
    day,
    currentStep: DAILY_PATH_STEPS[0].id,
    completedAt: null,
    steps: DAILY_PATH_STEPS.map(cloneStepTemplate),
  };
}

export function ensureDailyPath(path, day = isoDay()) {
  if (!path || path.day !== day || !Array.isArray(path.steps)) {
    return createDailyPath(day);
  }

  const knownSteps = new Map(path.steps.map((step) => [step.id, step]));
  const steps = DAILY_PATH_STEPS.map((template, index) => {
    const existing = knownSteps.get(template.id);
    return {
      ...cloneStepTemplate(template, index),
      ...existing,
      target: template.target,
      title: template.title,
    };
  });
  const activeStep = steps.find((step) => step.status === "active");
  const allDone = steps.every((step) => step.status === "done");

  return {
    ...path,
    day,
    steps,
    currentStep: allDone ? null : activeStep?.id || steps.find((step) => step.status !== "done")?.id || null,
    completedAt: allDone ? path.completedAt || null : null,
  };
}

export function getActivePathStep(path) {
  return path?.steps?.find((step) => step.id === path.currentStep) || null;
}

export function recordPathProgress(path, stepId, amount = 1, now = new Date()) {
  const current = ensureDailyPath(path);
  let changedStep = null;
  const steps = current.steps.map((step) => {
    if (step.id !== stepId || step.status === "done") {
      return step;
    }
    const progress = Math.min(step.target, Number(step.progress || 0) + amount);
    changedStep = {
      ...step,
      progress,
      status: progress >= step.target ? "done" : step.status,
      completedAt: progress >= step.target ? step.completedAt || now.toISOString() : step.completedAt,
    };
    return changedStep;
  });

  return {
    ...current,
    steps,
    currentStep: changedStep?.status === "done" ? current.currentStep : current.currentStep,
  };
}

export function advanceDailyPath(path, now = new Date()) {
  const current = ensureDailyPath(path);
  const steps = current.steps.map((step) => ({ ...step }));
  const firstOpenIndex = steps.findIndex((step) => step.status !== "done");

  if (firstOpenIndex === -1) {
    return {
      ...current,
      steps,
      currentStep: null,
      completedAt: current.completedAt || now.toISOString(),
    };
  }

  steps.forEach((step, index) => {
    if (step.status !== "done") {
      step.status = index === firstOpenIndex ? "active" : "pending";
    }
  });

  return {
    ...current,
    steps,
    currentStep: steps[firstOpenIndex].id,
    completedAt: null,
  };
}

export function completePathStep(path, stepId, now = new Date()) {
  const current = ensureDailyPath(path);
  const step = current.steps.find((item) => item.id === stepId);
  if (!step) {
    return current;
  }
  return advanceDailyPath(recordPathProgress(current, stepId, step.target, now), now);
}
