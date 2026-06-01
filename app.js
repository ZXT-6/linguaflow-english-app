const STORAGE_KEY = "linguaflow-state-v1";

const words = [
  {
    word: "focus",
    phonetic: "/'foʊkəs/",
    meaning: "专注；焦点",
    example: "I need to focus on my English lesson.",
    level: "A1",
  },
  {
    word: "habit",
    phonetic: "/'hæbɪt/",
    meaning: "习惯",
    example: "A small habit can change your learning speed.",
    level: "A1",
  },
  {
    word: "improve",
    phonetic: "/ɪm'pruːv/",
    meaning: "提高；改善",
    example: "Daily speaking practice will improve your fluency.",
    level: "A2",
  },
  {
    word: "confident",
    phonetic: "/'kɑːnfɪdənt/",
    meaning: "自信的",
    example: "She feels confident when she speaks English.",
    level: "A2",
  },
  {
    word: "context",
    phonetic: "/'kɑːntekst/",
    meaning: "语境；上下文",
    example: "Learn new words in context.",
    level: "B1",
  },
  {
    word: "accurate",
    phonetic: "/'ækjərət/",
    meaning: "准确的",
    example: "Clear pronunciation helps you sound accurate.",
    level: "B1",
  },
];

const listeningSentences = [
  "Every small step builds a strong habit.",
  "Practice English for ten minutes before breakfast.",
  "Clear goals make learning easier to manage.",
  "I can understand short conversations in English.",
];

const speakingPhrases = [
  "Could you say that again more slowly?",
  "I am still learning, but I can try.",
  "What does this word mean in this sentence?",
  "Let me think for a moment before I answer.",
];

const tasks = [
  { id: "vocab", title: "背 20 个核心单词", meta: "单词卡 + 选择题", minutes: 10 },
  { id: "listen", title: "完成 4 句听写", meta: "短句听力", minutes: 8 },
  { id: "read", title: "读 1 篇短文", meta: "阅读理解", minutes: 7 },
  { id: "speak", title: "跟读 4 个场景句", meta: "口语表达", minutes: 5 },
];

const defaultState = {
  minutes: 0,
  wordsLearned: 0,
  answers: [],
  knownWords: [],
  doneTasks: [],
  quizScore: 0,
  cardIndex: 0,
  listeningIndex: 0,
  speakingIndex: 0,
  notes: ["repeatable actions"],
  streak: 1,
};

let state = loadState();
let recordingInterval = null;
let recordingSeconds = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayText() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function setView(viewId) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const titles = {
    dashboard: "今日学习",
    vocabulary: "单词学习",
    listening: "听力训练",
    reading: "阅读理解",
    speaking: "口语训练",
  };
  $("#viewTitle").textContent = titles[viewId] || "今日学习";
}

function updateMetrics() {
  const correct = state.answers.filter(Boolean).length;
  const accuracy = state.answers.length ? Math.round((correct / state.answers.length) * 100) : 0;
  const level = state.wordsLearned >= 45 ? "B1" : state.wordsLearned >= 20 ? "A2" : "A1";

  $("#todayLabel").textContent = todayText();
  $("#minutesMetric").textContent = state.minutes;
  $("#wordsMetric").textContent = state.wordsLearned;
  $("#accuracyMetric").textContent = `${accuracy}%`;
  $("#levelMetric").textContent = level;
  $("#streakDays").textContent = `${state.streak} 天`;
  $("#streakBar").style.width = `${Math.min(state.streak * 14, 100)}%`;
  $("#quizScoreLabel").textContent = `${state.quizScore} 分`;
  $("#planDoneLabel").textContent = `${state.doneTasks.length}/${tasks.length}`;
  $("#knownWordsLabel").textContent = `${state.knownWords.length} 已掌握`;
}

function renderTasks() {
  $("#taskList").innerHTML = tasks
    .map((task) => {
      const done = state.doneTasks.includes(task.id);
      return `
        <button class="task-item ${done ? "done" : ""}" data-task="${task.id}" type="button">
          <span class="task-check" aria-hidden="true"></span>
          <span>
            <span class="task-title">${task.title}</span>
            <span class="task-meta">${task.meta}</span>
          </span>
          <span class="task-time">${task.minutes} 分钟</span>
        </button>
      `;
    })
    .join("");
}

function renderQuiz() {
  const current = words[(state.quizScore + state.cardIndex) % words.length];
  const options = shuffle([
    current.meaning,
    "预约；安排",
    "复杂的；困难的",
    "取消；放弃",
  ]).slice(0, 4);

  if (!options.includes(current.meaning)) {
    options[0] = current.meaning;
  }

  $("#quizWord").textContent = current.word;
  $("#quizFeedback").textContent = "";
  $("#quizFeedback").className = "feedback";
  $("#choiceList").innerHTML = options
    .map((option) => `<button class="choice-button" data-answer="${option}" type="button">${option}</button>`)
    .join("");
  $("#choiceList").dataset.correct = current.meaning;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function answerQuiz(button) {
  const correct = $("#choiceList").dataset.correct;
  const isCorrect = button.dataset.answer === correct;
  state.answers = [...state.answers.slice(-9), isCorrect];
  if (isCorrect) {
    state.quizScore += 10;
    state.wordsLearned += 1;
  }

  $$("#choiceList .choice-button").forEach((item) => {
    item.disabled = true;
    item.classList.toggle("correct", item.dataset.answer === correct);
    item.classList.toggle("wrong", item === button && !isCorrect);
  });

  $("#quizFeedback").textContent = isCorrect ? "正确，已计入今日进度。" : `答案是：${correct}`;
  $("#quizFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  saveState();
  updateMetrics();
  setTimeout(renderQuiz, 900);
}

function renderFlashcard() {
  const card = words[state.cardIndex % words.length];
  $("#cardLevel").textContent = card.level;
  $("#cardWord").textContent = card.word;
  $("#cardPhonetic").textContent = card.phonetic;
  $("#cardMeaning").textContent = card.meaning;
  $("#cardExample").textContent = card.example;

  $("#wordBankList").innerHTML = words
    .map((item, index) => {
      const known = state.knownWords.includes(item.word);
      return `
        <button class="word-row ${known ? "known" : ""}" data-card-index="${index}" type="button">
          <span>
            <strong>${item.word}</strong>
            <span>${item.meaning}</span>
          </span>
          <span>${item.level}</span>
        </button>
      `;
    })
    .join("");
}

function changeCard(delta) {
  state.cardIndex = (state.cardIndex + delta + words.length) % words.length;
  saveState();
  renderFlashcard();
}

function markKnown() {
  const word = words[state.cardIndex].word;
  if (!state.knownWords.includes(word)) {
    state.knownWords.push(word);
    state.wordsLearned += 1;
    state.minutes += 1;
  }
  saveState();
  updateMetrics();
  renderFlashcard();
}

function renderListening() {
  const sentence = listeningSentences[state.listeningIndex % listeningSentences.length];
  $("#listeningPrompt").textContent = sentence;
  $("#dictationInput").value = "";
  $("#dictationFeedback").textContent = "";
  $("#dictationFeedback").className = "feedback";
  $("#listeningList").innerHTML = listeningSentences
    .map(
      (item, index) => `
        <button class="resource-item" data-listening-index="${index}" type="button">
          <strong>句子 ${index + 1}</strong>
          <span>${item}</span>
        </button>
      `,
    )
    .join("");
}

function checkDictation() {
  const expected = listeningSentences[state.listeningIndex % listeningSentences.length];
  const actual = $("#dictationInput").value.trim();
  const normalized = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  const isCorrect = normalized(actual) === normalized(expected);
  state.answers = [...state.answers.slice(-9), isCorrect];
  if (isCorrect) {
    state.minutes += 2;
  }
  $("#dictationFeedback").textContent = isCorrect ? "听写正确。" : `参考句：${expected}`;
  $("#dictationFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  saveState();
  updateMetrics();
}

function renderReading() {
  const options = [
    "Small and regular practice.",
    "Only memorizing grammar rules.",
    "Waiting for a long holiday.",
  ];
  $("#readingChoices").innerHTML = options
    .map((option) => `<button class="choice-button" data-reading="${option}" type="button">${option}</button>`)
    .join("");
  renderNotes();
}

function renderNotes() {
  $("#noteList").innerHTML = state.notes
    .map((note, index) => `<button class="note-item" data-note-index="${index}" type="button">${note}</button>`)
    .join("");
}

function addNote() {
  const input = $("#noteInput");
  const value = input.value.trim();
  if (!value) {
    return;
  }
  state.notes.unshift(value);
  input.value = "";
  saveState();
  renderNotes();
}

function renderSpeaking() {
  const phrase = speakingPhrases[state.speakingIndex % speakingPhrases.length];
  $("#speakingLine").textContent = phrase;
  $("#phraseList").innerHTML = speakingPhrases
    .map(
      (item, index) => `
        <button class="phrase-item" data-speaking-index="${index}" type="button">
          <strong>表达 ${index + 1}</strong>
          <span>${item}</span>
        </button>
      `,
    )
    .join("");
}

function toggleRecording() {
  const button = $("#recordButton");
  const isRecording = button.classList.toggle("recording");
  if (!isRecording) {
    clearInterval(recordingInterval);
    $("#recordStatus").textContent = "本次练习已保存";
    $("#speakingFeedback").textContent = "口语时长已计入今日进度。";
    $("#speakingFeedback").className = "feedback good";
    state.minutes += Math.max(1, Math.ceil(recordingSeconds / 30));
    recordingSeconds = 0;
    saveState();
    updateMetrics();
    return;
  }

  $("#recordStatus").textContent = "练习中";
  $("#speakingFeedback").textContent = "";
  recordingSeconds = 0;
  recordingInterval = setInterval(() => {
    recordingSeconds += 1;
    const minute = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
    const second = String(recordingSeconds % 60).padStart(2, "0");
    $("#recordTimer").textContent = `${minute}:${second}`;
  }, 1000);
}

function completeNextTask() {
  const next = tasks.find((task) => !state.doneTasks.includes(task.id));
  if (!next) {
    state.doneTasks = [];
    state.minutes = 0;
  } else {
    state.doneTasks.push(next.id);
    state.minutes += next.minutes;
  }
  saveState();
  renderTasks();
  updateMetrics();
}

function resetDay() {
  state = {
    ...state,
    minutes: 0,
    wordsLearned: 0,
    answers: [],
    doneTasks: [],
    quizScore: 0,
  };
  saveState();
  renderAll();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      setView(viewButton.dataset.view);
      return;
    }

      const taskButton = event.target.closest("[data-task]");
      if (taskButton) {
        const taskId = taskButton.dataset.task;
        const task = tasks.find((item) => item.id === taskId);
        if (state.doneTasks.includes(taskId)) {
          state.doneTasks = state.doneTasks.filter((id) => id !== taskId);
          state.minutes = Math.max(0, state.minutes - task.minutes);
        } else {
          state.doneTasks.push(taskId);
          state.minutes += task.minutes;
        }
        saveState();
        renderTasks();
        updateMetrics();
      return;
    }

    const quizButton = event.target.closest("#choiceList .choice-button");
    if (quizButton) {
      answerQuiz(quizButton);
      return;
    }

    const wordButton = event.target.closest("[data-card-index]");
    if (wordButton) {
      state.cardIndex = Number(wordButton.dataset.cardIndex);
      saveState();
      renderFlashcard();
      return;
    }

    const listeningButton = event.target.closest("[data-listening-index]");
    if (listeningButton) {
      state.listeningIndex = Number(listeningButton.dataset.listeningIndex);
      saveState();
      renderListening();
      return;
    }

    const readingButton = event.target.closest("[data-reading]");
    if (readingButton) {
      const correct = "Small and regular practice.";
      const isCorrect = readingButton.dataset.reading === correct;
      $$("#readingChoices .choice-button").forEach((button) => {
        button.disabled = true;
        button.classList.toggle("correct", button.dataset.reading === correct);
        button.classList.toggle("wrong", button === readingButton && !isCorrect);
      });
      $("#readingFeedback").textContent = isCorrect ? "正确。" : `答案是：${correct}`;
      $("#readingFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
      state.answers = [...state.answers.slice(-9), isCorrect];
      saveState();
      updateMetrics();
      return;
    }

    const noteButton = event.target.closest("[data-note-index]");
    if (noteButton) {
      state.notes.splice(Number(noteButton.dataset.noteIndex), 1);
      saveState();
      renderNotes();
      return;
    }

    const phraseButton = event.target.closest("[data-speaking-index]");
    if (phraseButton) {
      state.speakingIndex = Number(phraseButton.dataset.speakingIndex);
      saveState();
      renderSpeaking();
    }
  });

  $("#completeTaskButton").addEventListener("click", completeNextTask);
  $("#resetDayButton").addEventListener("click", resetDay);
  $("#prevCardButton").addEventListener("click", () => changeCard(-1));
  $("#nextCardButton").addEventListener("click", () => changeCard(1));
  $("#knowCardButton").addEventListener("click", markKnown);
  $("#speakWordButton").addEventListener("click", () => speak(words[state.cardIndex].word));
  $("#playListeningButton").addEventListener("click", () =>
    speak(listeningSentences[state.listeningIndex % listeningSentences.length]),
  );
  $("#nextListeningButton").addEventListener("click", () => {
    state.listeningIndex = (state.listeningIndex + 1) % listeningSentences.length;
    saveState();
    renderListening();
  });
  $("#checkDictationButton").addEventListener("click", checkDictation);
  $("#addNoteButton").addEventListener("click", addNote);
  $("#noteInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addNote();
    }
  });
  $("#playSpeakingButton").addEventListener("click", () =>
    speak(speakingPhrases[state.speakingIndex % speakingPhrases.length]),
  );
  $("#recordButton").addEventListener("click", toggleRecording);
}

function renderAll() {
  updateMetrics();
  renderTasks();
  renderQuiz();
  renderFlashcard();
  renderListening();
  renderReading();
  renderSpeaking();
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js");
}

bindEvents();
renderAll();
