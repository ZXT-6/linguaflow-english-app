const STORAGE_KEY = "linguaflow-state-v1";

const words = [
  { word: "apple", phonetic: "/'aepəl/", meaning: "苹果", example: "I eat an apple every morning.", level: "A1" },
  { word: "book", phonetic: "/bʊk/", meaning: "书", example: "This book is easy to read.", level: "A1" },
  { word: "chair", phonetic: "/tʃer/", meaning: "椅子", example: "Please sit on the chair.", level: "A1" },
  { word: "water", phonetic: "/'wɔːtər/", meaning: "水", example: "I drink water after class.", level: "A1" },
  { word: "family", phonetic: "/'faeməli/", meaning: "家庭；家人", example: "My family supports my study.", level: "A1" },
  { word: "friend", phonetic: "/frend/", meaning: "朋友", example: "My friend helps me practice English.", level: "A1" },
  { word: "school", phonetic: "/skuːl/", meaning: "学校", example: "She goes to school by bus.", level: "A1" },
  { word: "teacher", phonetic: "/'tiːtʃər/", meaning: "老师", example: "The teacher explains the word clearly.", level: "A1" },
  { word: "listen", phonetic: "/'lɪsən/", meaning: "听", example: "Listen to the sentence twice.", level: "A1" },
  { word: "speak", phonetic: "/spiːk/", meaning: "说；讲", example: "Try to speak English every day.", level: "A1" },
  { word: "read", phonetic: "/riːd/", meaning: "阅读", example: "I read a short story at night.", level: "A1" },
  { word: "write", phonetic: "/raɪt/", meaning: "写", example: "Write three new sentences.", level: "A1" },
  { word: "learn", phonetic: "/lɜːrn/", meaning: "学习", example: "We learn new words in context.", level: "A1" },
  { word: "study", phonetic: "/'stʌdi/", meaning: "学习；研究", example: "I study English for twenty minutes.", level: "A1" },
  { word: "happy", phonetic: "/'haepi/", meaning: "开心的", example: "I feel happy when I understand English.", level: "A1" },
  { word: "small", phonetic: "/smɔːl/", meaning: "小的", example: "A small habit can bring progress.", level: "A1" },
  { word: "large", phonetic: "/lɑːrdʒ/", meaning: "大的", example: "This city has a large library.", level: "A1" },
  { word: "early", phonetic: "/'ɜːrli/", meaning: "早的；早地", example: "I get up early to review words.", level: "A1" },
  { word: "daily", phonetic: "/'deɪli/", meaning: "每日的；每天", example: "Daily practice improves your memory.", level: "A1" },
  { word: "focus", phonetic: "/'foʊkəs/", meaning: "专注；焦点", example: "I need to focus on my English lesson.", level: "A1" },
  { word: "habit", phonetic: "/'haebɪt/", meaning: "习惯", example: "A small habit can change your learning speed.", level: "A1" },
  { word: "practice", phonetic: "/'praektɪs/", meaning: "练习", example: "Practice makes your speaking smoother.", level: "A2" },
  { word: "review", phonetic: "/rɪ'vjuː/", meaning: "复习；回顾", example: "Review the words before you sleep.", level: "A2" },
  { word: "remember", phonetic: "/rɪ'membər/", meaning: "记得；记住", example: "I remember this word now.", level: "A2" },
  { word: "forget", phonetic: "/fər'ɡet/", meaning: "忘记", example: "Do not worry if you forget a word.", level: "A2" },
  { word: "improve", phonetic: "/ɪm'pruːv/", meaning: "提高；改善", example: "Daily speaking practice will improve your fluency.", level: "A2" },
  { word: "mistake", phonetic: "/mɪ'steɪk/", meaning: "错误", example: "A mistake can help you learn.", level: "A2" },
  { word: "correct", phonetic: "/kə'rekt/", meaning: "正确的；纠正", example: "Choose the correct meaning.", level: "A2" },
  { word: "answer", phonetic: "/'aensər/", meaning: "答案；回答", example: "Check your answer after listening.", level: "A2" },
  { word: "question", phonetic: "/'kwestʃən/", meaning: "问题", example: "Ask a question when you are unsure.", level: "A2" },
  { word: "meaning", phonetic: "/'miːnɪŋ/", meaning: "意思；含义", example: "What is the meaning of this word?", level: "A2" },
  { word: "sentence", phonetic: "/'sentəns/", meaning: "句子", example: "Make a sentence with this word.", level: "A2" },
  { word: "grammar", phonetic: "/'ɡraemər/", meaning: "语法", example: "Grammar helps sentences become clear.", level: "A2" },
  { word: "voice", phonetic: "/vɔɪs/", meaning: "声音", example: "Speak with a clear voice.", level: "A2" },
  { word: "slowly", phonetic: "/'sloʊli/", meaning: "慢慢地", example: "Please speak slowly.", level: "A2" },
  { word: "quickly", phonetic: "/'kwɪkli/", meaning: "快速地", example: "She reads quickly but clearly.", level: "A2" },
  { word: "confident", phonetic: "/'kɑːnfɪdənt/", meaning: "自信的", example: "She feels confident when she speaks English.", level: "A2" },
  { word: "useful", phonetic: "/'juːsfəl/", meaning: "有用的", example: "This phrase is useful in daily life.", level: "A2" },
  { word: "common", phonetic: "/'kɑːmən/", meaning: "常见的；共同的", example: "This is a common English expression.", level: "A2" },
  { word: "simple", phonetic: "/'sɪmpəl/", meaning: "简单的", example: "Use simple words first.", level: "A2" },
  { word: "context", phonetic: "/'kɑːntekst/", meaning: "语境；上下文", example: "Learn new words in context.", level: "B1" },
  { word: "accurate", phonetic: "/'aekjərət/", meaning: "准确的", example: "Clear pronunciation helps you sound accurate.", level: "B1" },
  { word: "fluent", phonetic: "/'fluːənt/", meaning: "流利的", example: "She is becoming more fluent.", level: "B1" },
  { word: "pronounce", phonetic: "/prə'naʊns/", meaning: "发音", example: "Can you pronounce this word?", level: "B1" },
  { word: "pronunciation", phonetic: "/prəˌnʌnsi'eɪʃən/", meaning: "发音", example: "Pronunciation takes time to improve.", level: "B1" },
  { word: "conversation", phonetic: "/ˌkɑːnvər'seɪʃən/", meaning: "对话；交谈", example: "We had a short conversation in English.", level: "B1" },
  { word: "expression", phonetic: "/ɪk'spreʃən/", meaning: "表达；短语", example: "This expression sounds natural.", level: "B1" },
  { word: "describe", phonetic: "/dɪ'skraɪb/", meaning: "描述", example: "Describe your day in English.", level: "B1" },
  { word: "compare", phonetic: "/kəm'per/", meaning: "比较", example: "Compare these two answers.", level: "B1" },
  { word: "choose", phonetic: "/tʃuːz/", meaning: "选择", example: "Choose the best answer.", level: "B1" },
  { word: "explain", phonetic: "/ɪk'spleɪn/", meaning: "解释", example: "Please explain this sentence.", level: "B1" },
  { word: "example", phonetic: "/ɪɡ'zaempəl/", meaning: "例子", example: "Give me one example.", level: "B1" },
  { word: "native", phonetic: "/'neɪtɪv/", meaning: "本地的；母语的", example: "A native speaker may say it differently.", level: "B1" },
  { word: "natural", phonetic: "/'naetʃərəl/", meaning: "自然的", example: "This sentence sounds natural.", level: "B1" },
  { word: "topic", phonetic: "/'tɑːpɪk/", meaning: "话题", example: "Today's topic is travel.", level: "B1" },
  { word: "opinion", phonetic: "/ə'pɪnjən/", meaning: "观点；意见", example: "What is your opinion?", level: "B1" },
  { word: "reason", phonetic: "/'riːzən/", meaning: "原因；理由", example: "Give a reason for your answer.", level: "B1" },
  { word: "result", phonetic: "/rɪ'zʌlt/", meaning: "结果", example: "Good habits lead to better results.", level: "B1" },
  { word: "goal", phonetic: "/ɡoʊl/", meaning: "目标", example: "Set a clear learning goal.", level: "B1" },
  { word: "progress", phonetic: "/'prɑːɡres/", meaning: "进步；进展", example: "You can see your progress each week.", level: "B1" },
  { word: "challenge", phonetic: "/'tʃaeləndʒ/", meaning: "挑战", example: "Speaking is a useful challenge.", level: "B1" },
  { word: "schedule", phonetic: "/'skedʒuːl/", meaning: "日程；安排", example: "Make a weekly study schedule.", level: "B1" },
  { word: "available", phonetic: "/ə'veɪləbəl/", meaning: "可用的；有空的", example: "The lesson is available offline.", level: "B1" },
  { word: "avoid", phonetic: "/ə'vɔɪd/", meaning: "避免", example: "Avoid translating every word.", level: "B1" },
  { word: "create", phonetic: "/kri'eɪt/", meaning: "创造；创建", example: "Create your own example sentence.", level: "B1" },
  { word: "develop", phonetic: "/dɪ'veləp/", meaning: "发展；培养", example: "Develop a daily English habit.", level: "B1" },
  { word: "method", phonetic: "/'meθəd/", meaning: "方法", example: "Find a method that works for you.", level: "B1" },
  { word: "support", phonetic: "/sə'pɔːrt/", meaning: "支持", example: "The app supports daily review.", level: "B1" },
  { word: "record", phonetic: "/rɪ'kɔːrd/", meaning: "记录；录音", example: "Record your voice and listen again.", level: "B1" },
  { word: "translate", phonetic: "/traenz'leɪt/", meaning: "翻译", example: "Try not to translate every sentence.", level: "B1" },
  { word: "understand", phonetic: "/ˌʌndər'staend/", meaning: "理解", example: "I understand the main idea.", level: "B1" },
  { word: "recognize", phonetic: "/'rekəɡnaɪz/", meaning: "认出；识别", example: "I can recognize this word in a text.", level: "B2" },
  { word: "communicate", phonetic: "/kə'mjuːnɪkeɪt/", meaning: "交流；沟通", example: "English helps people communicate.", level: "B2" },
  { word: "effective", phonetic: "/ɪ'fektɪv/", meaning: "有效的", example: "Short daily practice is effective.", level: "B2" },
  { word: "efficient", phonetic: "/ɪ'fɪʃənt/", meaning: "高效的", example: "Use an efficient review plan.", level: "B2" },
  { word: "essential", phonetic: "/ɪ'senʃəl/", meaning: "必要的；核心的", example: "Listening is essential for speaking.", level: "B2" },
  { word: "confidence", phonetic: "/'kɑːnfɪdəns/", meaning: "自信", example: "Practice builds confidence.", level: "B2" },
  { word: "strategy", phonetic: "/'straetədʒi/", meaning: "策略", example: "A good strategy saves time.", level: "B2" },
  { word: "specific", phonetic: "/spə'sɪfɪk/", meaning: "具体的；特定的", example: "Set a specific goal for this week.", level: "B2" },
  { word: "consistent", phonetic: "/kən'sɪstənt/", meaning: "持续一致的", example: "Consistent review is more important than speed.", level: "B2" },
  { word: "opportunity", phonetic: "/ˌɑːpər'tuːnəti/", meaning: "机会", example: "Use every opportunity to speak.", level: "B2" },
  { word: "achievement", phonetic: "/ə'tʃiːvmənt/", meaning: "成就", example: "Finishing a lesson is an achievement.", level: "B2" },
  { word: "environment", phonetic: "/ɪn'vaɪrənmənt/", meaning: "环境", example: "Create an English learning environment.", level: "B2" },
  { word: "motivation", phonetic: "/ˌmoʊtɪ'veɪʃən/", meaning: "动力；动机", example: "Clear progress gives you motivation.", level: "B2" },
  { word: "independent", phonetic: "/ˌɪndɪ'pendənt/", meaning: "独立的", example: "Become an independent English learner.", level: "B2" },
  { word: "recommend", phonetic: "/ˌrekə'mend/", meaning: "推荐；建议", example: "I recommend reviewing words every day.", level: "B2" },
  { word: "summarize", phonetic: "/'sʌməraɪz/", meaning: "总结", example: "Summarize the article in two sentences.", level: "B2" },
  { word: "evaluate", phonetic: "/ɪ'vaeljueɪt/", meaning: "评估", example: "Evaluate your progress each month.", level: "B2" },
  { word: "interrupt", phonetic: "/ˌɪntə'rʌpt/", meaning: "打断", example: "Do not interrupt the speaker.", level: "B2" },
  { word: "maintain", phonetic: "/meɪn'teɪn/", meaning: "保持；维护", example: "Maintain your learning streak.", level: "B2" },
  { word: "achieve", phonetic: "/ə'tʃiːv/", meaning: "实现；达到", example: "You can achieve your English goal.", level: "B2" },
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
  const distractors = shuffle(words.filter((item) => item.word !== current.word))
    .map((item) => item.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 3);
  const options = shuffle([current.meaning, ...distractors]);

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
