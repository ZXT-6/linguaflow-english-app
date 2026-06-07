import {
  DAILY_PATH_STEPS,
  advanceDailyPath,
  createDailyPath,
  ensureDailyPath,
  getActivePathStep,
  recordPathProgress,
} from "./daily-path-core.mjs";
import { buildReviewQueue, calculateLearningStats, getMasteryLabel, updateWordProgress } from "./learning-core.mjs";
import { createSyncState, resolveSyncConflict, touchLocalState } from "./sync-core.mjs";
import { getIdentityUser, loadRemoteState, mergeRemoteState, saveRemoteState } from "./sync-client.mjs";

const STORAGE_KEY = "linguaflow-state-v1";
const LIBRARY_PAGE_SIZE = 20;
const levelLabels = {
  A1: "基础词",
  A2: "核心词",
  B1: "进阶词",
  B2: "高频词",
};

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

const wordBooks = [
  {
    id: "general",
    title: "普通学习",
    tag: "基础",
    description: "系统基础词 + 你导入的自定义词库。",
    wordNames: null,
  },
  {
    id: "middle-school",
    title: "中考词汇",
    tag: "中考",
    description: "覆盖初中阶段常见生活、校园和基础表达。",
    wordNames: ["apple", "book", "chair", "water", "family", "friend", "school", "teacher", "listen", "speak", "read", "write", "learn", "study", "happy", "small", "large", "early", "daily", "answer"],
  },
  {
    id: "gaokao",
    title: "高考词汇",
    tag: "高考",
    description: "面向高中阅读、写作和完形常见核心词。",
    wordNames: ["focus", "habit", "practice", "review", "remember", "forget", "improve", "mistake", "correct", "question", "meaning", "sentence", "grammar", "voice", "slowly", "quickly", "confident", "useful", "common", "simple"],
  },
  {
    id: "cet4",
    title: "四级词汇",
    tag: "CET-4",
    description: "适合四级基础阅读、听力和写作的高频词。",
    wordNames: ["context", "accurate", "fluent", "pronounce", "pronunciation", "conversation", "expression", "describe", "compare", "choose", "explain", "example", "native", "natural", "topic", "opinion", "reason", "result", "goal", "progress"],
  },
  {
    id: "cet6",
    title: "六级词汇",
    tag: "CET-6",
    description: "偏抽象表达、学术阅读和观点论证词。",
    wordNames: ["challenge", "schedule", "available", "avoid", "create", "develop", "method", "support", "record", "translate", "understand", "recognize", "communicate", "effective", "efficient", "essential", "confidence", "strategy", "specific", "consistent"],
  },
  {
    id: "upgrade",
    title: "专升本词汇",
    tag: "专升本",
    description: "强调考试常见动词、抽象名词和应用表达。",
    wordNames: ["opportunity", "achievement", "environment", "motivation", "independent", "recommend", "summarize", "evaluate", "interrupt", "maintain", "achieve", "develop", "method", "support", "translate", "understand", "reason", "result", "goal", "progress"],
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

const languagePacks = {
  en: {
    label: "英语",
    speechLang: "en-US",
    words,
    listening: listeningSentences,
    speaking: speakingPhrases,
    readingTitle: "Building an English Habit",
    readingBody:
      "Learning English becomes easier when practice is small and regular. Read one short text, listen to one clear sentence, and speak for one minute every day. Progress grows from repeatable actions.",
    readingQuestion: "What helps English learning become easier?",
    readingAnswer: "Small and regular practice.",
    readingOptions: ["Small and regular practice.", "Only memorizing grammar rules.", "Waiting for a long holiday."],
  },
  ja: {
    label: "日语",
    speechLang: "ja-JP",
    words: [
      { word: "こんにちは", phonetic: "konnichiwa", meaning: "你好", example: "こんにちは、今日も勉強しましょう。", level: "A1" },
      { word: "ありがとう", phonetic: "arigatou", meaning: "谢谢", example: "手伝ってくれてありがとう。", level: "A1" },
      { word: "学校", phonetic: "gakkou", meaning: "学校", example: "明日、学校へ行きます。", level: "A1" },
      { word: "練習", phonetic: "renshuu", meaning: "练习", example: "毎日、発音を練習します。", level: "A2" },
      { word: "会話", phonetic: "kaiwa", meaning: "会话", example: "短い会話を聞きます。", level: "A2" },
      { word: "目標", phonetic: "mokuhyou", meaning: "目标", example: "今週の目標を決めます。", level: "B1" },
    ],
    listening: ["毎日少しずつ練習します。", "新しい言葉を声に出して読みます。", "短い会話を聞いて書きます。"],
    speaking: ["もう一度ゆっくり言ってください。", "私は日本語を勉強しています。", "この言葉の意味は何ですか。"],
    readingTitle: "毎日の日本語",
    readingBody: "日本語は、短い練習を毎日続けると覚えやすくなります。聞く、読む、話す練習を少しずつ重ねましょう。",
    readingQuestion: "日本語を覚えやすくする方法は何ですか。",
    readingAnswer: "短い練習を毎日続けること。",
    readingOptions: ["短い練習を毎日続けること。", "月に一度だけ勉強すること。", "単語を見ないこと。"],
  },
  es: {
    label: "西班牙语",
    speechLang: "es-ES",
    words: [
      { word: "hola", phonetic: "OH-lah", meaning: "你好", example: "Hola, estudio español cada día.", level: "A1" },
      { word: "gracias", phonetic: "GRAH-syahs", meaning: "谢谢", example: "Gracias por ayudarme.", level: "A1" },
      { word: "escuela", phonetic: "es-KWE-lah", meaning: "学校", example: "Voy a la escuela por la mañana.", level: "A1" },
      { word: "practicar", phonetic: "prak-tee-KAR", meaning: "练习", example: "Necesito practicar la pronunciación.", level: "A2" },
      { word: "conversación", phonetic: "kon-ber-sa-SYON", meaning: "对话", example: "Escucho una conversación corta.", level: "A2" },
      { word: "objetivo", phonetic: "ob-heh-TEE-bo", meaning: "目标", example: "Tengo un objetivo claro esta semana.", level: "B1" },
    ],
    listening: ["Practico español diez minutos cada día.", "Escucho una frase corta y la escribo.", "Hablar un poco ayuda a recordar."],
    speaking: ["¿Puedes repetirlo más despacio?", "Estoy aprendiendo español.", "¿Qué significa esta palabra?"],
    readingTitle: "Un hábito de español",
    readingBody: "Aprender español es más fácil cuando la práctica es corta y constante. Lee una frase, escucha una oración y habla un minuto cada día.",
    readingQuestion: "¿Qué ayuda a aprender español?",
    readingAnswer: "La práctica corta y constante.",
    readingOptions: ["La práctica corta y constante.", "Esperar mucho tiempo.", "No escuchar frases."],
  },
};

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
  favoriteWords: [],
  checkInDates: [],
  wordProgress: {},
  customWords: [],
  authUser: null,
  pendingCode: null,
  authMode: "login",
  preferences: {
    theme: "light",
    dailyGoal: 30,
    targetLanguage: "en",
    wordBookId: "general",
    autoSpeak: false,
    reminder: false,
  },
  doneTasks: [],
  dailyPath: createDailyPath(),
  sync: createSyncState(),
  quizScore: 0,
  cardIndex: 0,
  practiceIndex: 0,
  practiceMode: "choice",
  libraryPage: 0,
  mistakeFilter: "all",
  listeningIndex: 0,
  speakingIndex: 0,
  notes: ["repeatable actions"],
  streak: 1,
};

let state = loadState();
let recordingInterval = null;
let recordingSeconds = 0;
let remoteSaveTimer = null;
let pendingConfirmAction = null;
let practiceAdvanceTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const publicViews = new Set(["auth"]);

function on(selector, eventName, handler) {
  const element = $(selector);
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function setTextIfPresent(selector, text) {
  const element = $(selector);
  if (element) {
    element.textContent = text;
  }
}

function setNextTextIfPresent(selector, text) {
  const element = $(selector);
  if (element?.nextElementSibling) {
    element.nextElementSibling.textContent = text;
  }
}

function getUserNickname(user = state.authUser) {
  return user?.profile?.nickname || user?.name || user?.username || "游客";
}

function getUserInitial(user = state.authUser) {
  return user?.profile?.initials || getUserNickname(user).trim().slice(0, 1).toUpperCase() || "LF";
}

function getLevelLabel(level) {
  return levelLabels[level] || level || "基础词";
}

function getStudyStageLabel(stats) {
  if (stats.masteredWords >= 45) {
    return "进阶阶段";
  }
  if (stats.masteredWords >= 20) {
    return "核心阶段";
  }
  return "基础阶段";
}

function hashText(value) {
  return Array.from(String(value || "LF")).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function createUserProfile(user = {}) {
  const seed = String(user.id || user.phone || user.username || user.name || "linguaflow-user");
  const palette = [
    ["#1d3a34", "#d9efe6"],
    ["#332141", "#efe1f7"],
    ["#56321f", "#f4e2d2"],
    ["#1f3656", "#dce7f8"],
    ["#3d3a1d", "#eee9c8"],
  ];
  const [avatarColor, avatarAccent] = palette[hashText(seed) % palette.length];
  const nickname = user.profile?.nickname || user.name || user.username || "游客";
  return {
    nickname,
    avatarSeed: user.profile?.avatarSeed || seed,
    avatarColor: user.profile?.avatarColor || avatarColor,
    avatarAccent: user.profile?.avatarAccent || avatarAccent,
    avatarUrl: user.profile?.avatarUrl || "",
    initials: user.profile?.initials || nickname.trim().slice(0, 1).toUpperCase() || "LF",
  };
}

function normalizeAuthUser(user) {
  if (!user) {
    return null;
  }
  const normalized = {
    ...user,
    id: user.id || user.phone || user.username || user.name || `local-${Date.now()}`,
  };
  return {
    ...normalized,
    profile: createUserProfile(normalized),
  };
}

function renderUserAvatar(selector, user = state.authUser) {
  const element = $(selector);
  if (!element) {
    return;
  }
  const profile = normalizeAuthUser(user)?.profile || createUserProfile({ name: "LinguaFlow", id: "guest" });
  element.textContent = profile.avatarUrl ? "" : profile.initials;
  element.style.setProperty("--avatar-color", profile.avatarColor);
  element.style.setProperty("--avatar-accent", profile.avatarAccent);
  element.style.backgroundImage = profile.avatarUrl ? `url("${profile.avatarUrl}")` : "";
}

function allWords() {
  const language = currentLanguageKey();
  const customWords = (Array.isArray(state.customWords) ? state.customWords : []).filter((item) => (item.language || "en") === language);
  if (language !== "en") {
    return [...activePack().words, ...customWords];
  }

  return [...baseWordsForBook(currentBookId()), ...customWords.filter((item) => (item.bookId || "general") === currentBookId())];
}

function currentLanguageKey() {
  return languagePacks[state.preferences?.targetLanguage] ? state.preferences.targetLanguage : "en";
}

function currentBookId() {
  if (currentLanguageKey() !== "en") {
    return "general";
  }
  const id = state.preferences?.wordBookId || "general";
  return wordBooks.some((book) => book.id === id) ? id : "general";
}

function activeWordBook() {
  return wordBooks.find((book) => book.id === currentBookId()) || wordBooks[0];
}

function baseWordsForBook(bookId = currentBookId()) {
  const book = wordBooks.find((item) => item.id === bookId) || wordBooks[0];
  if (!book.wordNames) {
    return activePack().words;
  }
  const byWord = new Map(activePack().words.map((item) => [normalizeWord(item.word), item]));
  return book.wordNames.map((word) => byWord.get(normalizeWord(word))).filter(Boolean);
}

function wordsForBook(bookId) {
  const language = currentLanguageKey();
  const customWords = (Array.isArray(state.customWords) ? state.customWords : []).filter(
    (item) => (item.language || "en") === language && (item.bookId || "general") === bookId,
  );
  return [...baseWordsForBook(bookId), ...customWords];
}

function activePack() {
  return languagePacks[currentLanguageKey()];
}

function activeListeningSentences() {
  return activePack().listening;
}

function activeSpeakingPhrases() {
  return activePack().speaking;
}

function isAuthenticated() {
  return Boolean(state.authUser);
}

function syncAuthShell() {
  const authenticated = isAuthenticated();
  document.body.classList.toggle("is-authenticated", authenticated);
  document.body.classList.toggle("is-guest", !authenticated);
  $(".auth-shell")?.toggleAttribute("hidden", authenticated);
  $(".app-shell")?.toggleAttribute("hidden", !authenticated);
}

function openAccountEntry() {
  setView(isAuthenticated() ? "profile" : "auth");
}

function isAdminUser() {
  return state.authUser?.role === "admin";
}

function progressFor(word) {
  return (state.wordProgress || {})[normalizeWord(word)] || null;
}

function recordWordStudy(word, correct) {
  state.wordProgress = updateWordProgress(state.wordProgress || {}, word, correct);
}

function normalizeWord(value) {
  return value.trim().toLowerCase();
}

function isFavoriteWord(word) {
  const key = normalizeWord(word);
  return (state.favoriteWords || []).some((item) => normalizeWord(item) === key);
}

function toggleFavoriteWord(word) {
  const key = normalizeWord(word);
  const favorites = state.favoriteWords || [];
  state.favoriteWords = isFavoriteWord(word) ? favorites.filter((item) => normalizeWord(item) !== key) : [word, ...favorites];
  saveState();
  renderFlashcard();
  renderFavorites();
}

function tokenizeEnglish(text) {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^1\d{10}$/.test(value);
}

function loadState() {
  try {
    return hydrateState({ ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") });
  } catch {
    return hydrateState({ ...defaultState });
  }
}

function hydrateState(value) {
  return {
    ...defaultState,
    ...value,
    favoriteWords: Array.isArray(value.favoriteWords) ? value.favoriteWords : [],
    checkInDates: Array.isArray(value.checkInDates) ? value.checkInDates : [],
    authUser: normalizeAuthUser(value.authUser),
    preferences: { ...defaultState.preferences, ...(value.preferences || {}) },
    dailyPath: ensureDailyPath(value.dailyPath, new Date().toISOString().slice(0, 10)),
    sync: { ...createSyncState(), ...(value.sync || {}) },
  };
}

function saveState({ touch = true, remote = true } = {}) {
  if (touch) {
    state = touchLocalState(state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (remote) {
    queueRemoteSave();
  }
}

function todayText() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hasCheckedInToday() {
  return (state.checkInDates || []).includes(todayKey());
}

function checkInToday() {
  const today = todayKey();
  const alreadyChecked = state.checkInDates.includes(today);
  if (!alreadyChecked) {
    state.checkInDates = [...state.checkInDates, today];
    state.streak = Math.max(state.streak || 1, countCurrentStreak(state.checkInDates));
    saveState();
  }
  updateMetrics();
  renderCheckInCalendar();
  showCheckInFeedback(alreadyChecked ? "今天已打卡" : "打卡成功");
}

function showCheckInFeedback(message) {
  const feedback = $("#checkInFeedback");
  if (!feedback) {
    return;
  }
  feedback.textContent = message;
  feedback.hidden = false;
  feedback.classList.remove("show");
  void feedback.offsetWidth;
  feedback.classList.add("show");
  window.clearTimeout(showCheckInFeedback.timer);
  showCheckInFeedback.timer = window.setTimeout(() => {
    feedback.classList.remove("show");
  }, 2200);
}

function countCurrentStreak(dates) {
  const checked = new Set(dates || []);
  let count = 0;
  const cursor = new Date();
  while (checked.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return Math.max(1, count || state.streak || 1);
}

function renderCheckInCalendar() {
  const calendar = $("#checkInCalendar");
  const statusLabel = $("#checkInStatusLabel");
  const checkInButton = $("#checkInButton");
  if (!calendar || !statusLabel || !checkInButton) {
    return;
  }
  const dates = new Set(state.checkInDates || []);
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"].map((label) => `<span class="check-in-weekday">${label}</span>`);
  const leadingDays = Array.from({ length: monthStart.getDay() }, () => `<span class="check-in-day empty" aria-hidden="true"></span>`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), index + 1);
    const key = date.toISOString().slice(0, 10);
    const label = String(date.getDate());
    return `<span class="check-in-day ${dates.has(key) ? "checked" : ""} ${key === todayKey() ? "today" : ""}">${label}</span>`;
  });
  calendar.innerHTML = [...weekdays, ...leadingDays, ...days].join("");
  statusLabel.textContent = hasCheckedInToday() ? "今天已打卡" : "今天未打卡";
  checkInButton.textContent = hasCheckedInToday() ? "已打卡" : "每日打卡";
  checkInButton.classList.toggle("checked", hasCheckedInToday());
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = activePack().speechLang;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function speakCurrentCardWord() {
  const wordList = allWords();
  if (wordList.length) {
    speak(wordList[state.cardIndex % wordList.length].word);
  }
}

function speakCurrentPracticeWord() {
  const question = currentPracticeQuestion();
  if (question) {
    speak(question.word.word);
  }
}

function speakOnKeyboard(event, handler) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handler();
  }
}

function setView(viewId) {
  if (!publicViews.has(viewId) && !isAuthenticated()) {
    viewId = "auth";
    const feedback = $("#authFeedback");
    if (feedback) {
      feedback.textContent = "请先登录后再使用学习和后台功能。";
      feedback.className = "feedback bad";
    }
  }

  syncAuthShell();
  if (viewId === "auth") {
    return;
  }

  let activeView = null;
  $$(".view").forEach((view) => {
    const isActive = view.id === viewId;
    view.classList.toggle("active", isActive);
    view.classList.remove("view-entering");
    if (isActive) {
      activeView = view;
    }
  });
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  if (activeView) {
    void activeView.offsetWidth;
    activeView.classList.add("view-entering");
  }

  const titles = {
    dashboard: "\u4eca\u65e5\u5b66\u4e60",
    vocabulary: "\u5355\u8bcd\u5b66\u4e60",
    practice: "练习测试",
    mistakes: "错题本",
    profile: "我的",
    favorites: "收藏夹",
    library: "\u8bcd\u5e93",
    listening: "\u542c\u529b\u8bad\u7ec3",
    reading: "\u9605\u8bfb\u7406\u89e3",
    speaking: "\u53e3\u8bed\u8bad\u7ec3",
    auth: "\u767b\u5f55\u6ce8\u518c",
    admin: "后台管理",
    settings: "\u8bbe\u7f6e",
  };
  $("#viewTitle").textContent = titles[viewId] || "今日学习";
}

function updateMetrics() {
  renderCheckInCalendar();
  const stats = calculateLearningStats(allWords(), state.wordProgress || {}, state.answers || []);
  const level = getStudyStageLabel(stats);
  const dailyGoal = state.preferences?.dailyGoal || 30;
  const donePathSteps = state.dailyPath?.steps?.filter((step) => step.status === "done").length || 0;

  setTextIfPresent("#todayLabel", todayText());
  if ($("#minutesMetric")) {
    setTextIfPresent("#minutesMetric", state.minutes);
    setNextTextIfPresent("#minutesMetric", `目标 ${dailyGoal} 分钟`);
  }
  if ($("#wordsMetric")) {
    setTextIfPresent("#wordsMetric", stats.studiedWords);
    setNextTextIfPresent("#wordsMetric", `${stats.masteredWords} 个已掌握`);
  }
  setTextIfPresent("#accuracyMetric", `${stats.accuracy}%`);
  if ($("#levelMetric")) {
    setTextIfPresent("#levelMetric", level);
    setNextTextIfPresent("#levelMetric", `${stats.dueReviews} 个待复习`);
  }
  setTextIfPresent("#streakDays", `${state.streak} 天`);
  setTextIfPresent("#dashboardStreakDays", `${state.streak} 天`);
  if ($("#streakBar")) {
    $("#streakBar").style.width = `${Math.min(state.streak * 14, 100)}%`;
  }
  setTextIfPresent("#quizScoreLabel", `${state.quizScore} 分`);
  setTextIfPresent("#planDoneLabel", `${donePathSteps}/${DAILY_PATH_STEPS.length}`);
  const dailyProgress = Math.min(100, Math.round((stats.studiedWords / 20) * 100));
  setTextIfPresent("#dashboardProgressPercent", `${dailyProgress}%`);
  if ($("#dashboardProgressRing")) {
    $("#dashboardProgressRing").style.setProperty("--progress", `${dailyProgress}%`);
  }
  setTextIfPresent("#weeklyHoursMetric", `${Math.max(1, (state.minutes / 60 + 8.5).toFixed(1))} 小时`);
}

function renderWordBooks() {
  const activeBook = activeWordBook();
  const currentWords = allWords();
  setTextIfPresent("#activeBookLabel", activeBook.title);
  setTextIfPresent("#activeBookCount", `${currentWords.length} 个词`);
  const list = $("#wordBookList");
  if (!list) {
    return;
  }
  const books = currentLanguageKey() === "en" ? wordBooks : [{ ...wordBooks[0], title: activePack().label, description: "当前语言课程词库。", tag: activePack().label }];
  list.innerHTML = books
    .map((book) => {
      const count = currentLanguageKey() === "en" ? wordsForBook(book.id).length : allWords().length;
      const studied = currentLanguageKey() === "en" ? wordsForBook(book.id).filter((item) => progressFor(item.word)).length : currentWords.filter((item) => progressFor(item.word)).length;
      return `
        <button class="word-book-option ${book.id === currentBookId() ? "active" : ""}" data-word-book="${escapeHtml(book.id)}" type="button">
          <span>${escapeHtml(book.tag)}</span>
          <strong>${escapeHtml(book.title)}</strong>
          <small>${escapeHtml(book.description)}</small>
          <em>${studied}/${count} 已学习</em>
        </button>
      `;
    })
    .join("");
}

function renderDailyPath() {
  state.dailyPath = ensureDailyPath(state.dailyPath, new Date().toISOString().slice(0, 10));
  const active = getActivePathStep(state.dailyPath);
  const list = $("#dailyPathList");
  if (!list) {
    return;
  }

  list.innerHTML = state.dailyPath.steps
    .map((step, index) => {
      const progress = Math.min(step.progress, step.target);
      const percent = Math.round((progress / step.target) * 100);
      const statusText = step.status === "done" ? "已完成" : step.status === "active" ? "进行中" : "等待";
      return `
        <button class="daily-path-item ${step.status}" data-path-step="${step.id}" type="button">
          <span class="path-index">${index + 1}</span>
          <span class="path-copy">
            <strong>${escapeHtml(step.title)}</strong>
            <small>${progress}/${step.target} · ${statusText}</small>
          </span>
          <span class="path-progress" aria-hidden="true"><span style="width:${percent}%"></span></span>
        </button>
      `;
    })
    .join("");
}

function continueDailyPath() {
  const active = getActivePathStep(state.dailyPath);
  const step = DAILY_PATH_STEPS.find((item) => item.id === active?.id);
  if (step?.view) {
    setView(step.view);
  }
}

function searchHomeWord(event) {
  event.preventDefault();
  const input = $("#homeWordSearchInput");
  const query = input?.value.trim().toLowerCase() || "";
  if (!query) {
    input?.focus();
    return;
  }

  const wordList = allWords();
  const exactIndex = wordList.findIndex((item) => normalizeWord(item.word) === query || item.meaning.toLowerCase() === query);
  const fuzzyIndex = exactIndex >= 0 ? exactIndex : wordList.findIndex((item) => normalizeWord(item.word).includes(query) || item.meaning.toLowerCase().includes(query));

  state.libraryPage = 0;
  if (fuzzyIndex >= 0) {
    state.cardIndex = fuzzyIndex;
    saveState({ remote: false });
    setView("vocabulary");
    renderFlashcard();
    return;
  }

  const librarySearch = $("#librarySearchInput");
  if (librarySearch) {
    librarySearch.value = query;
  }
  saveState({ remote: false });
  setView("library");
  renderLibrary();
}

function recordDailyPathStep(stepId, amount = 1, { refresh = true } = {}) {
  const before = state.dailyPath?.currentStep;
  state.dailyPath = advanceDailyPath(recordPathProgress(state.dailyPath, stepId, amount));
  const after = state.dailyPath?.currentStep;
  saveState();
  if (refresh) {
    renderAll();
  } else {
    updateMetrics();
    renderDailyPath();
  }
  if (refresh && before && before !== after) {
    setTimeout(continueDailyPath, 450);
  }
}

function renderSyncStatus() {
  const sync = state.sync || createSyncState();
  const statusText = {
    offline: "离线可用",
    pending: "等待同步",
    syncing: "同步中",
    synced: "已同步",
    conflict: "需要选择",
    error: "同步失败",
  };

  $("#syncStatusLabel").textContent = statusText[sync.status] || "离线可用";
  $("#syncDetailLabel").textContent = sync.lastSyncedAt
    ? `上次同步：${new Date(sync.lastSyncedAt).toLocaleString("zh-CN")}`
    : "学习数据已保存在本机，登录后可同步到云端。";
  $("#syncConflictPanel").hidden = sync.status !== "conflict" || !sync.conflict;
  $("#appStatus").hidden = sync.status !== "syncing";
  $("#appStatusText").textContent = sync.status === "syncing" ? "正在同步学习数据" : "";
}

function queueRemoteSave() {
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(syncRemoteState, 1200);
}

async function syncRemoteState() {
  if (state.sync?.status === "conflict") {
    renderSyncStatus();
    return;
  }

  try {
    state.sync = { ...createSyncState(), ...(state.sync || {}), status: "syncing" };
    renderSyncStatus();
    const result = await saveRemoteState(state);
    if (result.status === "saved") {
      state = hydrateState(result.state);
      saveState({ touch: false, remote: false });
    } else {
      state.sync = { ...state.sync, status: "offline" };
      saveState({ touch: false, remote: false });
    }
  } catch {
    state.sync = { ...state.sync, status: "offline" };
    saveState({ touch: false, remote: false });
  }
  renderSyncStatus();
}

async function initializeRemoteState() {
  const user = await getIdentityUser();
  if (user) {
    state.sync = { ...state.sync, status: "pending" };
    renderSyncStatus();
  }

  try {
    const remote = await loadRemoteState();
    if (remote.status === "unauthorized") {
      state.sync = { ...state.sync, status: "offline" };
      saveState({ touch: false, remote: false });
      renderSyncStatus();
      return;
    }
    const merged = mergeRemoteState(state, remote.state);
    state = hydrateState(merged.state);
    saveState({ touch: false, remote: merged.status === "local-newer" || merged.status === "local-only" });
    renderAll();
  } catch {
    state.sync = { ...state.sync, status: "offline" };
    saveState({ touch: false, remote: false });
    renderSyncStatus();
  }
}

function handleSyncConflict(choice) {
  state = hydrateState(resolveSyncConflict(state, choice));
  saveState({ remote: choice !== "later" });
  renderAll();
}

function openConfirmDialog({ title, message, action }) {
  pendingConfirmAction = action;
  $("#confirmDialogTitle").textContent = title;
  $("#confirmDialogMessage").textContent = message;
  $("#confirmDialog").hidden = false;
  $("#cancelDialogButton").focus();
}

function closeConfirmDialog() {
  pendingConfirmAction = null;
  $("#confirmDialog").hidden = true;
}

function confirmDialogAction() {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (action) {
    action();
  }
}

function renderReviewQueue() {
  const queue = buildReviewQueue(allWords(), state.wordProgress || {}, new Date(), 5);
  const list = $("#reviewQueueList");
  if (!list) {
    return;
  }

  $("#reviewQueueLabel").textContent = queue.length ? `${queue.length} 个待练` : "暂无复习";
  list.innerHTML = queue.length
    ? queue
        .map((item) => {
          const label = getMasteryLabel(item.mastery);
          const reason = item.status === "due" ? "到期复习" : "新词学习";
          return `
            <button class="review-item" data-card-index="${allWords().findIndex((word) => normalizeWord(word.word) === normalizeWord(item.word))}" type="button">
              <span>
                <strong>${escapeHtml(item.word)}</strong>
                <small>${escapeHtml(item.meaning)}</small>
              </span>
              <span class="mastery-pill mastery-${item.mastery}">${label}</span>
              <em>${reason}</em>
            </button>
          `;
        })
        .join("")
    : `<p class="empty-state">今天没有到期复习，继续学习新词。</p>`;
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
  const wordList = allWords();
  if (!wordList.length) {
    $("#quizWord").textContent = "暂无单词";
    $("#choiceList").innerHTML = `<p class="empty-state">当前语言还没有可练习的单词，请先在词库或后台添加内容。</p>`;
    $("#quizFeedback").textContent = "";
    $("#quizFeedback").className = "feedback";
    return;
  }
  const current = wordList[(state.quizScore + state.cardIndex) % wordList.length];
  const distractors = shuffle(wordList.filter((item) => item.word !== current.word))
    .map((item) => item.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 3);
  const options = shuffle([current.meaning, ...distractors]);

  $("#quizWord").innerHTML = `<span class="clickable-word" role="button" tabindex="0" data-speak-text="${escapeHtml(current.word)}" title="点击朗读" aria-label="点击朗读 ${escapeHtml(current.word)}">${escapeHtml(current.word)}</span>`;
  $("#quizFeedback").textContent = "";
  $("#quizFeedback").className = "feedback";
  $("#choiceList").innerHTML = options
    .map((option) => `<button class="choice-button" data-answer="${escapeHtml(option)}" type="button"><span>${escapeHtml(option)}</span></button>`)
    .join("");
  $("#choiceList").dataset.correct = current.meaning;
  $("#choiceList").dataset.word = current.word;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function answerQuiz(button) {
  const correct = $("#choiceList").dataset.correct;
  const word = $("#choiceList").dataset.word;
  const isCorrect = button.dataset.answer === correct;
  state.answers = [...state.answers.slice(-9), isCorrect];
  recordWordStudy(word, isCorrect);
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
  recordDailyPathStep("review", 1, { refresh: false });
  updateMetrics();
  renderReviewQueue();
  setTimeout(renderQuiz, 900);
}

function currentPracticeQuestion() {
  const wordList = allWords();
  if (!wordList.length) {
    return null;
  }
  const word = wordList[(state.practiceIndex || 0) % wordList.length];
  const distractors = shuffle(wordList.filter((item) => item.word !== word.word))
    .map((item) => item.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 3);
  return {
    word,
    options: shuffle([word.meaning, ...distractors]),
  };
}

function renderPracticeQuiz() {
  if (practiceAdvanceTimer) {
    clearTimeout(practiceAdvanceTimer);
    practiceAdvanceTimer = null;
  }
  const question = currentPracticeQuestion();
  $$(".practice-tab").forEach((button) => button.classList.toggle("active", button.dataset.practiceTab === (state.practiceMode || "choice")));
  if (!question) {
    $("#practiceWord").textContent = "暂无单词";
    $("#practiceChoiceList").innerHTML = `<p class="empty-state">当前语言还没有可练习的单词。</p>`;
    return;
  }

  const modeLabels = {
    choice: "请选择下列单词的中文意思",
    spelling: "根据释义选择对应单词",
    listening: "听发音后选择正确释义",
  };
  $("#practiceCounter").textContent = `${((state.practiceIndex || 0) % 10) + 1}/10`;
  $("#practicePrompt").textContent = modeLabels[state.practiceMode || "choice"];
  $("#practiceWord").textContent = state.practiceMode === "spelling" ? question.word.meaning : question.word.word;
  $("#practiceChoiceList").dataset.correct = state.practiceMode === "spelling" ? question.word.word : question.word.meaning;
  $("#practiceChoiceList").dataset.word = question.word.word;
  $("#practiceChoiceList").innerHTML = (state.practiceMode === "spelling" ? shuffle([question.word.word, ...allWords().filter((item) => item.word !== question.word.word).slice(0, 3).map((item) => item.word)]) : question.options)
    .map((option, index) => `<button class="choice-button" data-practice-answer="${escapeHtml(option)}" onpointerdown="window.answerPracticeChoice?.(this); return false;" onclick="window.answerPracticeChoice?.(this); return false;" type="button"><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></button>`)
    .join("");
  $("#practiceFeedback").textContent = "";
  $("#practiceFeedback").className = "feedback";
  $("#nextPracticeButton").hidden = true;
}

function answerPractice(button) {
  if (button.disabled) {
    return;
  }
  if (practiceAdvanceTimer) {
    clearTimeout(practiceAdvanceTimer);
    practiceAdvanceTimer = null;
  }
  const correct = $("#practiceChoiceList").dataset.correct;
  const word = $("#practiceChoiceList").dataset.word;
  const isCorrect = button.dataset.practiceAnswer === correct;
  state.answers = [...state.answers.slice(-9), isCorrect];
  recordWordStudy(word, isCorrect);
  if (isCorrect) {
    state.quizScore += 10;
    state.wordsLearned += 1;
  }
  const choiceButtons = $$("#practiceChoiceList .choice-button");
  choiceButtons.forEach((item) => {
    item.disabled = isCorrect || item === button;
    item.classList.toggle("correct", item.dataset.practiceAnswer === correct);
    item.classList.toggle("wrong", item === button && !isCorrect);
  });
  $("#practiceFeedback").textContent = isCorrect ? "答对了，下一题马上开始。" : `答错了，正确答案是：${correct}`;
  $("#practiceFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  $("#nextPracticeButton").hidden = isCorrect;
  saveState();
  if (isCorrect) {
    recordDailyPathStep("review", 1, { refresh: false });
    practiceAdvanceTimer = setTimeout(nextPracticeQuestion, 650);
  }
  updateMetrics();
  renderMistakes();
  renderDesktopDashboard();
}

window.answerPracticeChoice = (button) => answerPractice(button);

function nextPracticeQuestion() {
  if (practiceAdvanceTimer) {
    clearTimeout(practiceAdvanceTimer);
    practiceAdvanceTimer = null;
  }
  state.practiceIndex = (state.practiceIndex || 0) + 1;
  saveState();
  renderPracticeQuiz();
}

function mistakeItems() {
  const fromProgress = Object.values(state.wordProgress || {})
    .filter((item) => item.wrong > 0)
    .map((item) => {
      const word = allWords().find((entry) => normalizeWord(entry.word) === normalizeWord(item.word));
      return {
        type: "word",
        title: item.word,
        phonetic: word?.phonetic || "",
        meaning: word?.meaning || "待复习单词",
        correct: word?.meaning || "正确释义",
        wrong: "上次答错",
        date: item.lastStudiedAt?.slice(0, 10) || "2026-06-03",
      };
    });
  const fallback = [
    { type: "word", title: "abandon", phonetic: "/əˈbændən/", meaning: "v. 放弃；抛弃", correct: "放弃", wrong: "保留", date: "2026-05-20" },
    { type: "choice", title: "convenient", phonetic: "/kənˈviːniənt/", meaning: "adj. 方便的；便利的", correct: "方便的", wrong: "复杂的", date: "2026-05-19" },
    { type: "spelling", title: "happy", phonetic: "/ˈhæpi/", meaning: "adj. 快乐的", correct: "happy", wrong: "hapy", date: "2026-05-18" },
    { type: "listening", title: "environment", phonetic: "/ɪnˈvaɪrənmənt/", meaning: "n. 环境；周围的事物", correct: "environment", wrong: "equipment", date: "2026-05-17" },
  ];
  return fromProgress.length ? fromProgress : fallback;
}

function renderMistakes() {
  const filter = state.mistakeFilter || "all";
  $$("[data-mistake-filter]").forEach((button) => button.classList.toggle("active", button.dataset.mistakeFilter === filter));
  const items = mistakeItems().filter((item) => filter === "all" || item.type === filter);
  $("#mistakeList").innerHTML = items.length
    ? items
        .map(
          (item) => `
        <article class="mistake-item">
          <button class="star-button" type="button" aria-label="收藏">☆</button>
          <strong class="clickable-word" role="button" tabindex="0" data-speak-text="${escapeHtml(item.title)}" title="点击朗读" aria-label="点击朗读 ${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.phonetic)}</span>
          <p>${escapeHtml(item.meaning)}</p>
          <small>正确答案：${escapeHtml(item.correct)}</small>
          <small>错误答案：${escapeHtml(item.wrong)}</small>
          <em>错误时间：${escapeHtml(item.date)}</em>
        </article>
      `,
        )
        .join("")
    : `<p class="empty-state">当前筛选下暂无错题。</p>`;
}

function renderDesktopDashboard() {
  const stats = calculateLearningStats(allWords(), state.wordProgress || {}, state.answers || []);
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  $("#desktopCalendar").innerHTML = days
    .map((day) => `<span class="${day === 20 ? "active" : day % 3 === 0 ? "studied" : ""}">${day}</span>`)
    .join("");
  $("#desktopReminderList").innerHTML = [
    ["每日学习目标", "每天学习 20 个单词", "10:00"],
    ["复习错题", "复习10道错题", "20:00"],
    ["学习报告", "每周学习总结", "周日 21:00"],
  ]
    .map((item, index) => `<label class="reminder-row"><span><strong>${item[0]}</strong><small>${item[1]}</small></span><em>${item[2]}</em><input type="checkbox" ${index < 2 || state.preferences?.reminder ? "checked" : ""} /></label>`)
    .join("");
  $("#weeklyChart").innerHTML = [42, 36, 51, 44, 63, 39, 31].map((height) => `<span style="height:${height}%"></span>`).join("");
  $("#achievementBadges").innerHTML = [
    ["坚持学习", `${state.streak}天`],
    ["单词达人", `${stats.studiedWords}词`],
    ["练习高手", `${stats.accuracy}%`],
    ["完美主义", "90%+"],
  ]
    .map((badge) => `<article class="badge-item"><strong>★</strong><span>${badge[0]}</span><small>${badge[1]}</small></article>`)
    .join("");
  $("#recentLearningList").innerHTML = [
    ["Day 12 - 常用水果词汇", "单词学习", "18/20"],
    ["不规则动词专项练习", "练习测试", "1/2"],
    ["高频错题复习", "错题本", `${mistakeItems().length}/10`],
  ]
    .map((item) => `<article class="recent-row"><strong>${item[0]}</strong><span>${item[1]}</span><em>${item[2]}</em><button class="text-button" type="button" data-view="practice">继续学习</button></article>`)
    .join("");
}

function renderProfileDashboard() {
  const stats = calculateLearningStats(allWords(), state.wordProgress || {}, state.answers || []);
  const user = normalizeAuthUser(state.authUser);
  const nickname = getUserNickname(user);
  const syncLabel = user ? (state.sync?.lastSyncedAt ? "云端已同步" : state.sync?.status === "syncing" ? "云端同步中" : "等待云端同步") : "未登录";
  $("#profileHeroName").textContent = user ? nickname : "Language Learner";
  $("#profileHeroDetail").textContent = user
    ? `账号：${user.username || user.name}${user.phone ? ` · 手机号：${user.phone}` : " · 本地账号"} · ${syncLabel} · 连续学习 ${state.streak} 天 · 收藏 ${state.favoriteWords?.length || 0} 个单词`
    : "登录后可同步学习记录，保留你的每日进度。";
  $("#profileAccuracyMetric").textContent = `${stats.accuracy || 85}%`;
  $("#profileStats").innerHTML = [
    ["学习天数", `${state.streak}`],
    ["累计单词", `${stats.studiedWords}`],
    ["累计小时", `${Math.max(1, (state.minutes / 60 + 12.5).toFixed(1))}`],
    ["正确率", `${stats.accuracy || 85}%`],
  ]
    .map((item) => `<article><strong>${item[1]}</strong><span>${item[0]}</span></article>`)
    .join("");
}

function renderFlashcard() {
  const wordList = allWords();
  if (!wordList.length) {
    $("#cardLevel").textContent = "空";
    $("#cardWord").textContent = "暂无单词";
    $("#cardPhonetic").textContent = "";
    $("#cardMeaning").textContent = "请先添加学习内容";
    $("#cardExample").textContent = "添加词库后，这里会显示单词、释义和例句。";
    $("#favoriteCardButton").disabled = true;
    $("#favoriteCardButton").classList.remove("active");
    return;
  }
  const card = wordList[state.cardIndex % wordList.length];
  const favoriteButton = $("#favoriteCardButton");
  $("#cardLevel").className = `mastery-pill mastery-${progressFor(card.word)?.mastery || 0}`;
  $("#cardLevel").textContent = `${getLevelLabel(card.level)} · ${getMasteryLabel(progressFor(card.word)?.mastery || 0)}`;
  $("#cardWord").textContent = card.word;
  $("#cardPhonetic").textContent = card.phonetic || "";
  $("#cardMeaning").textContent = card.meaning;
  $("#cardExample").textContent = card.example;
  favoriteButton.disabled = false;
  favoriteButton.dataset.favoriteWord = card.word;
  const isFavorite = isFavoriteWord(card.word);
  favoriteButton.classList.toggle("active", isFavorite);
  favoriteButton.textContent = isFavorite ? "★" : "☆";
  favoriteButton.title = isFavorite ? "取消收藏" : "收藏";
  favoriteButton.setAttribute("aria-label", isFavorite ? "取消收藏当前单词" : "收藏当前单词");

}

function renderFavorites() {
  const favoriteKeys = new Set((state.favoriteWords || []).map((word) => normalizeWord(word)));
  const favoriteItems = allWords().filter((item) => favoriteKeys.has(normalizeWord(item.word)));
  $("#favoriteCountLabel").textContent = `${favoriteItems.length} 个`;
  $("#favoriteList").innerHTML = favoriteItems.length
    ? favoriteItems
        .map((item) => {
          const cardIndex = allWords().findIndex((word) => normalizeWord(word.word) === normalizeWord(item.word));
          return `
            <article class="favorite-item">
              <button class="library-word-button" data-card-index="${cardIndex}" type="button">
                <strong>${escapeHtml(item.word)}</strong>
                <span>${escapeHtml(item.meaning)}</span>
                <small>${escapeHtml(item.example)}</small>
              </button>
              <button class="star-button active" data-favorite-word="${escapeHtml(item.word)}" type="button" aria-label="取消收藏">★</button>
            </article>
          `;
        })
        .join("")
    : `<div class="favorite-empty"><p class="empty-state">还没有收藏单词。遇到想反复看的单词时，点单词卡右下角的星星就会放进这里。</p></div>`;
}

function renderLibrary() {
  const search = $("#librarySearchInput")?.value.trim().toLowerCase() || "";
  const level = $("#libraryLevelFilter")?.value || "all";
  const wordList = allWords();
  const scopeTitle = currentLanguageKey() === "en" ? activeWordBook().title : activePack().label;
  const filtered = wordList
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const matchesSearch = !search || item.word.toLowerCase().includes(search) || item.meaning.toLowerCase().includes(search);
      const matchesLevel = level === "all" || item.level === level;
      return matchesSearch && matchesLevel;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
  state.libraryPage = Math.min(Math.max(Number(state.libraryPage) || 0, 0), totalPages - 1);
  const pageStart = state.libraryPage * LIBRARY_PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + LIBRARY_PAGE_SIZE);
  setTextIfPresent("#libraryTitle", `${scopeTitle}词书`);
  $("#libraryCountLabel").textContent = `${filtered.length}/${wordList.length} 个单词`;
  $("#libraryPagination").hidden = filtered.length <= LIBRARY_PAGE_SIZE;
  $("#libraryPageLabel").textContent = `${state.libraryPage + 1}/${totalPages}`;
  $("#prevLibraryPageButton").disabled = state.libraryPage <= 0;
  $("#nextLibraryPageButton").disabled = state.libraryPage >= totalPages - 1;
  if (!filtered.length) {
    $("#libraryList").innerHTML = `<p class="empty-state">没有找到匹配单词。</p>`;
    return;
  }

  $("#libraryList").innerHTML = pageItems
    .map(({ item, index }) => {
      const source = item.custom ? "自定义" : "基础";
      const progress = progressFor(item.word);
      const deleteButton = item.custom ? `<button class="delete-word-button" data-delete-word="${escapeHtml(item.word)}" type="button">删除</button>` : "";
      return `
        <article class="library-row">
          <button class="library-word-button" data-card-index="${index}" type="button">
            <strong class="clickable-word" data-speak-text="${escapeHtml(item.word)}" title="点击朗读">${escapeHtml(item.word)}</strong>
            <span>${escapeHtml(item.meaning)}</span>
            <small>${escapeHtml(item.example)}</small>
          </button>
          <div class="library-meta">
            <span class="level-pill">${escapeHtml(getLevelLabel(item.level))}</span>
            <span class="mastery-pill mastery-${progress?.mastery || 0}">${getMasteryLabel(progress?.mastery || 0)}</span>
            <span class="source-pill">${source}</span>
            ${deleteButton}
          </div>
        </article>
      `;
    })
    .join("");
}

function changeLibraryPage(delta) {
  const search = $("#librarySearchInput")?.value.trim().toLowerCase() || "";
  const level = $("#libraryLevelFilter")?.value || "all";
  const filteredLength = allWords().filter((item) => {
    const matchesSearch = !search || item.word.toLowerCase().includes(search) || item.meaning.toLowerCase().includes(search);
    const matchesLevel = level === "all" || item.level === level;
    return matchesSearch && matchesLevel;
  }).length;
  const totalPages = Math.max(1, Math.ceil(filteredLength / LIBRARY_PAGE_SIZE));
  state.libraryPage = Math.min(Math.max((Number(state.libraryPage) || 0) + delta, 0), totalPages - 1);
  saveState({ remote: false });
  renderLibrary();
}

function addCustomWord(event) {
  event.preventDefault();
  const word = $("#newWordInput").value.trim();
  const meaning = $("#newMeaningInput").value.trim();
  const example = $("#newExampleInput").value.trim() || `I want to learn the word ${word}.`;
  const level = $("#newLevelSelect").value;
  const feedback = $("#addWordFeedback");

  if (!word || !meaning) {
    feedback.textContent = "请填写英文单词和中文释义。";
    feedback.className = "feedback bad";
    return;
  }

  if (allWords().some((item) => normalizeWord(item.word) === normalizeWord(word))) {
    feedback.textContent = "\u8fd9\u4e2a\u5355\u8bcd\u5df2\u7ecf\u5728\u8bcd\u5e93\u91cc\u3002";
    feedback.className = "feedback bad";
    return;
  }

  state.customWords = [...(Array.isArray(state.customWords) ? state.customWords : []), { word, phonetic: "", meaning, example, level, custom: true, language: currentLanguageKey(), bookId: currentBookId() }];
  saveState();
  event.currentTarget.reset();
  feedback.textContent = "已添加到词库。";
  feedback.className = "feedback good";
  updateMetrics();
  renderQuiz();
  renderFlashcard();
  renderLibrary();
}

function parseBulkWordLine(line) {
  const parts = line
    .split(/[,，\t|]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      word: parts[0],
      meaning: parts[1],
      example: parts[2] || `I want to learn the word ${parts[0]}.`,
    };
  }
  const match = line.trim().match(/^([A-Za-z][A-Za-z'\- ]*)\s+(.+)$/);
  if (!match) {
    return null;
  }
  return {
    word: match[1].trim(),
    meaning: match[2].trim(),
    example: `I want to learn the word ${match[1].trim()}.`,
  };
}

function importBulkWords() {
  const input = $("#bulkWordInput");
  const feedback = $("#bulkImportFeedback");
  const lines = input.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const existing = new Set(allWords().map((item) => normalizeWord(item.word)));
  const imported = [];

  lines.forEach((line) => {
    const item = parseBulkWordLine(line);
    if (!item || !item.word || !item.meaning || existing.has(normalizeWord(item.word))) {
      return;
    }
    existing.add(normalizeWord(item.word));
    imported.push({
      word: item.word,
      phonetic: "",
      meaning: item.meaning,
      example: item.example,
      level: "A1",
      custom: true,
      language: currentLanguageKey(),
      bookId: currentBookId(),
    });
  });

  if (!imported.length) {
    feedback.textContent = "没有可导入的新单词，请检查格式。";
    feedback.className = "feedback bad";
    return;
  }

  state.customWords = [...(Array.isArray(state.customWords) ? state.customWords : []), ...imported];
  state.cardIndex = allWords().length ? state.cardIndex % allWords().length : 0;
  saveState();
  input.value = "";
  feedback.textContent = `已导入 ${imported.length} 个单词到${activeWordBook().title}。`;
  feedback.className = "feedback good";
  renderAll();
}

function deleteCustomWord(word) {
  const target = normalizeWord(word);
  state.customWords = (Array.isArray(state.customWords) ? state.customWords : []).filter((item) => normalizeWord(item.word) !== target);
  state.knownWords = state.knownWords.filter((item) => normalizeWord(item) !== target);
  if (state.wordProgress) {
    delete state.wordProgress[target];
  }
  state.cardIndex = allWords().length ? state.cardIndex % allWords().length : 0;
  saveState();
  updateMetrics();
  renderQuiz();
  renderFlashcard();
  renderLibrary();
  renderReviewQueue();
}

function lookupText(event) {
  event.preventDefault();
  const query = $("#lookupInput").value.trim();
  const result = $("#lookupResult");
  if (!query) {
    result.innerHTML = `<p class="empty-state">请输入一个英文单词或句子。</p>`;
    return;
  }

  const byWord = new Map(allWords().map((item) => [normalizeWord(item.word), item]));
  const tokens = tokenizeEnglish(query);

  if (tokens.length === 1) {
    const match = byWord.get(tokens[0]);
    result.innerHTML = match
      ? `<div class="lookup-card"><div class="lookup-title"><strong class="clickable-word" role="button" tabindex="0" data-speak-text="${escapeHtml(match.word)}" title="点击朗读">${escapeHtml(match.word)}</strong><div class="lookup-actions"><span class="level-pill">${escapeHtml(getLevelLabel(match.level))}</span></div></div><p>${escapeHtml(match.meaning)}</p><small>${escapeHtml(match.example)}</small></div>`
      : `<div class="lookup-card"><strong class="clickable-word" role="button" tabindex="0" data-speak-text="${escapeHtml(query)}" title="点击朗读">${escapeHtml(query)}</strong><p>词库暂未收录，可以在下方添加。</p></div>`;
    return;
  }

  const uniqueTokens = [...new Set(tokens)];
  const known = uniqueTokens.map((token) => byWord.get(token)).filter(Boolean);
  const unknown = uniqueTokens.filter((token) => !byWord.has(token));
  result.innerHTML = `
    <div class="lookup-card">
      <div class="lookup-title"><strong>\u53e5\u5b50\u67e5\u8be2</strong><div class="lookup-actions"><span class="level-pill">${tokens.length} \u4e2a\u8bcd</span></div></div>
      <p>${escapeHtml(query)}</p>
      <div class="lookup-groups">
        <div><h3>已收录</h3>${known.length ? known.map((item) => `<button class="word-chip" data-speak-text="${escapeHtml(item.word)}" type="button">${escapeHtml(item.word)}：${escapeHtml(item.meaning)}</button>`).join("") : `<span class="muted-text">暂无匹配词。</span>`}</div>
        <div><h3>未收录</h3>${unknown.length ? unknown.map((word) => `<span class="word-chip muted">${escapeHtml(word)}</span>`).join("") : `<span class="muted-text">句子里的词都已收录。</span>`}</div>
      </div>
    </div>`;
}

function clearLookup() {
  $("#lookupInput").value = "";
  $("#lookupResult").innerHTML = "";
}

function changeCard(delta) {
  const wordList = allWords();
  state.cardIndex = (state.cardIndex + delta + wordList.length) % wordList.length;
  saveState();
  renderFlashcard();
}

function markKnown() {
  const word = allWords()[state.cardIndex % allWords().length].word;
  recordWordStudy(word, true);
  if (!state.knownWords.includes(word)) {
    state.knownWords.push(word);
    state.wordsLearned += 1;
    state.minutes += 1;
  }
  saveState();
  recordDailyPathStep("newWords", 1, { refresh: false });
  updateMetrics();
  renderLibrary();
  renderReviewQueue();
  changeCard(1);
}

function renderListening() {
  const sentences = activeListeningSentences();
  const sentence = sentences[state.listeningIndex % sentences.length];
  $("#listeningPrompt").textContent = sentence;
  $("#dictationInput").value = "";
  $("#dictationFeedback").textContent = "";
  $("#dictationFeedback").className = "feedback";
  $("#listeningList").innerHTML = sentences.length
    ? sentences
        .map(
          (item, index) => `
        <button class="resource-item" data-listening-index="${index}" type="button">
          <strong>句子 ${index + 1}</strong>
          <span>${item}</span>
        </button>
      `,
        )
        .join("")
    : `<p class="empty-state">暂无听力素材，请先在后台或词库中添加练习内容。</p>`;
}

function checkDictation() {
  const sentences = activeListeningSentences();
  const expected = sentences[state.listeningIndex % sentences.length];
  const actual = $("#dictationInput").value.trim();
  const normalized = (text) =>
    text
      .toLocaleLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const isCorrect = normalized(actual) === normalized(expected);
  state.answers = [...state.answers.slice(-9), isCorrect];
  const knownWords = new Map(allWords().map((word) => [normalizeWord(word.word), word.word]));
  tokenizeEnglish(expected).forEach((token) => {
    const word = knownWords.get(token);
    if (word) {
      recordWordStudy(word, isCorrect);
    }
  });
  if (isCorrect) {
    state.minutes += 2;
  }
  $("#dictationFeedback").textContent = isCorrect ? "听写正确。" : `参考句：${expected}`;
  $("#dictationFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  saveState();
  if (isCorrect) {
    recordDailyPathStep("dictation", 1);
  }
  updateMetrics();
  renderReviewQueue();
}

function renderReading() {
  const pack = activePack();
  $("#readingTitle").textContent = pack.readingTitle;
  $("#readingBody").textContent = pack.readingBody;
  $("#readingQuestion").textContent = pack.readingQuestion;
  const options = pack.readingOptions;
  $("#readingChoices").innerHTML = options
    .map((option) => `<button class="choice-button" data-reading="${option}" type="button">${option}</button>`)
    .join("");
  renderNotes();
}

function renderNotes() {
  $("#noteList").innerHTML = state.notes.length
    ? state.notes.map((note, index) => `<button class="note-item" data-note-index="${index}" type="button">${note}</button>`).join("")
    : `<p class="empty-state">还没有生词摘录。阅读时输入生词或短语，会保存在这里。</p>`;
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
  const phrases = activeSpeakingPhrases();
  const phrase = phrases[state.speakingIndex % phrases.length];
  $("#speakingLine").textContent = phrase;
  $("#phraseList").innerHTML = phrases.length
    ? phrases
        .map(
          (item, index) => `
        <button class="phrase-item" data-speaking-index="${index}" type="button">
          <strong>表达 ${index + 1}</strong>
          <span>${item}</span>
        </button>
      `,
        )
        .join("")
    : `<p class="empty-state">暂无口语素材，请先添加场景表达。</p>`;
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
    recordDailyPathStep("speaking", 1);
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


function setAuthMode(mode, { persist = true } = {}) {
  state.authMode = mode;
  $$("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#authModeLabel").textContent = mode === "register" ? "手机号和验证码" : "用户名和密码";
  const authPanel = $(".auth-panel");
  authPanel?.classList.remove("auth-mode-entering");
  $$("[data-auth-field]").forEach((field) => {
    const scope = field.dataset.authField;
    field.hidden = !(scope === "both" || scope === mode);
    field.classList.remove("auth-mode-entering");
    if (!field.hidden) {
      void field.offsetWidth;
      field.classList.add("auth-mode-entering");
    }
  });
  $("#authUsernameInput").required = true;
  $("#authPhoneInput").required = mode === "register";
  $("#authCodeInput").required = mode === "register";
  $("#authPasswordInput").required = true;
  $("#authPasswordInput").placeholder = mode === "register" ? "设置至少 6 位密码" : "输入密码";
  $("#authPasswordInput").autocomplete = mode === "register" ? "new-password" : "current-password";
  if (authPanel) {
    void authPanel.offsetWidth;
    authPanel.classList.add("auth-mode-entering");
  }
  if (persist) {
    saveState();
  }
}

function sendVerificationCode() {
  const username = $("#authUsernameInput").value.trim();
  const phone = $("#authPhoneInput").value.trim();
  const feedback = $("#authFeedback");
  if (username.length < 2 || !isValidPhone(phone)) {
    feedback.textContent = "请先填写用户名和 11 位手机号。";
    feedback.className = "feedback bad";
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.pendingCode = { username, phone, code, expiresAt: Date.now() + 5 * 60 * 1000 };
  saveState();
  feedback.textContent = `验证码已生成：${code}。接入后端后这里会改为短信发送。`;
  feedback.className = "feedback good";
}

function submitAuth(event) {
  event.preventDefault();
  const username = $("#authUsernameInput").value.trim();
  const phone = $("#authPhoneInput").value.trim();
  const password = $("#authPasswordInput").value.trim();
  const code = $("#authCodeInput").value.trim();
  const feedback = $("#authFeedback");
  if (state.authMode === "login") {
    if (username.length < 2 || password.length < 6) {
      feedback.textContent = "请输入用户名和至少 6 位密码。";
      feedback.className = "feedback bad";
      return;
    }
    state.authUser = normalizeAuthUser({
      name: username,
      username,
      phone: "",
      role: username.toLowerCase().includes("admin") ? "admin" : "learner",
      createdAt: new Date().toISOString(),
    });
    saveState();
    renderUser();
    feedback.textContent = "登录成功。";
    feedback.className = "feedback good";
    setView("dashboard");
    return;
  }
  if (username.length < 2 || !isValidPhone(phone) || password.length < 6) {
    feedback.textContent = "请填写手机号、用户名和至少 6 位密码。";
    feedback.className = "feedback bad";
    return;
  }
  if (!state.pendingCode || state.pendingCode.username !== username || state.pendingCode.phone !== phone || state.pendingCode.code !== code || Date.now() > state.pendingCode.expiresAt) {
    feedback.textContent = "验证码不正确或已过期。";
    feedback.className = "feedback bad";
    return;
  }
  state.authUser = normalizeAuthUser({
    name: username,
    username,
    phone,
    role: username.toLowerCase().includes("admin") ? "admin" : "learner",
    createdAt: new Date().toISOString(),
  });
  state.pendingCode = null;
  saveState();
  renderUser();
  feedback.textContent = "注册成功，已登录。";
  feedback.className = "feedback good";
  setView("dashboard");
}

function renderUser() {
  const user = normalizeAuthUser(state.authUser);
  state.authUser = user;
  const nickname = getUserNickname(user);
  const account = user ? `${user.username || user.name}${user.phone ? ` · 手机号：${user.phone}` : " · 本地账号"}` : "登录后同步学习资料";
  syncAuthShell();
  renderUserAvatar("#authButtonAvatar", user);
  renderUserAvatar("#profileHeroAvatar", user);
  setTextIfPresent("#authButtonNickname", user ? nickname : "登录/注册");
  $("#authButton")?.classList.toggle("is-guest", !user);
  $("#userStatusLabel").textContent = user ? "已登录" : "未登录";
  $("#profileName").textContent = nickname;
  $("#profileNicknameLabel").textContent = user ? `昵称：${nickname}` : "未设置昵称";
  $("#profileAccountLabel").textContent = account;
  $("#profileSettingStreak").textContent = `${state.streak} 天`;
  $("#profileSettingFavorites").textContent = `${state.favoriteWords?.length || 0} 个`;
  renderUserAvatar("#profileAvatar", user);
  $("#openAuthButton")?.toggleAttribute("hidden", Boolean(user));
  $("#logoutButton")?.toggleAttribute("hidden", !user);
  renderProfileDashboard();
  $$("[data-view='admin']").forEach((button) => {
    button.disabled = Boolean(user) && !isAdminUser();
    button.title = Boolean(user) && !isAdminUser() ? "仅管理员可进入后台" : "";
  });
}

function logout() {
  state.authUser = null;
  saveState();
  renderUser();
  setView("auth");
}

function applyPreferences() {
  state.preferences = { ...defaultState.preferences, ...(state.preferences || {}) };
  const prefs = state.preferences;
  document.body.dataset.theme = "light";
  $("#targetLanguageSelect").value = currentLanguageKey();
  $("#dailyGoalInput").value = prefs.dailyGoal || 30;
  $("#autoSpeakToggle").checked = Boolean(prefs.autoSpeak);
  $("#reminderToggle").checked = Boolean(prefs.reminder);
}

function savePreferences() {
  const previousLanguage = currentLanguageKey();
  const nextLanguage = $("#targetLanguageSelect").value;
  state.preferences = {
    theme: "light",
    dailyGoal: Number($("#dailyGoalInput").value) || 30,
    targetLanguage: nextLanguage,
    wordBookId: nextLanguage === "en" ? currentBookId() : "general",
    autoSpeak: $("#autoSpeakToggle").checked,
    reminder: $("#reminderToggle").checked,
  };
  if (previousLanguage !== currentLanguageKey()) {
    state.cardIndex = 0;
    state.listeningIndex = 0;
    state.speakingIndex = 0;
    state.dailyPath = createDailyPath();
  }
  saveState();
  applyPreferences();
  $("#settingsFeedback").textContent = "设置已保存。";
  $("#settingsFeedback").className = "feedback good";
  renderAll();
}

function renderAdmin() {
  const pack = activePack();
  const wordCount = allWords().length;
  $("#adminLanguageMetric").textContent = pack.label;
  $("#adminWordsMetric").textContent = wordCount;
  $("#adminRoleLabel").textContent = isAdminUser() ? "管理员" : "无权限";
  $("#adminAccessHint").textContent = isAdminUser()
    ? "可以维护当前语言的课程词条，新增内容会进入本地状态并参与同步。"
    : "当前账号不是管理员。测试环境中，用户名包含 admin 的账号会获得管理员角色。";
  $$("#adminWordForm input, #adminWordForm textarea, #adminWordForm button").forEach((control) => {
    control.disabled = !isAdminUser();
  });
}

function addAdminWord(event) {
  event.preventDefault();
  const feedback = $("#adminFeedback");
  if (!isAdminUser()) {
    feedback.textContent = "只有管理员可以维护课程内容。";
    feedback.className = "feedback bad";
    return;
  }

  const word = $("#adminWordInput").value.trim();
  const meaning = $("#adminMeaningInput").value.trim();
  const example = $("#adminExampleInput").value.trim() || `Practice the word ${word}.`;
  if (!word || !meaning) {
    feedback.textContent = "请填写词条和中文释义。";
    feedback.className = "feedback bad";
    return;
  }
  if (allWords().some((item) => normalizeWord(item.word) === normalizeWord(word))) {
    feedback.textContent = "这个词条已经存在。";
    feedback.className = "feedback bad";
    return;
  }

  state.customWords = [
    ...(Array.isArray(state.customWords) ? state.customWords : []),
    { word, phonetic: "", meaning, example, level: "A1", custom: true, language: currentLanguageKey(), bookId: currentBookId(), source: "admin" },
  ];
  saveState();
  event.currentTarget.reset();
  feedback.textContent = "已添加到当前语言内容库。";
  feedback.className = "feedback good";
  renderAll();
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
    dailyPath: createDailyPath(),
    quizScore: 0,
  };
  saveState();
  renderAll();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const speakTextButton = event.target.closest("[data-speak-text]");
    if (speakTextButton) {
      event.stopPropagation();
      speak(speakTextButton.dataset.speakText);
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      setView(viewButton.dataset.view);
      return;
    }

    const pathButton = event.target.closest("[data-path-step]");
    if (pathButton) {
      const step = DAILY_PATH_STEPS.find((item) => item.id === pathButton.dataset.pathStep);
      if (step?.view) {
        setView(step.view);
      }
      return;
    }

    const syncChoiceButton = event.target.closest("[data-sync-choice]");
    if (syncChoiceButton) {
      handleSyncConflict(syncChoiceButton.dataset.syncChoice);
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

    const clickedChoiceButton = event.target.closest(".choice-button");
    const quizButton = clickedChoiceButton?.closest("#choiceList") ? clickedChoiceButton : null;
    if (quizButton) {
      answerQuiz(quizButton);
      return;
    }

    const practiceTab = event.target.closest("[data-practice-tab]");
    if (practiceTab) {
      state.practiceMode = practiceTab.dataset.practiceTab;
      saveState();
      renderPracticeQuiz();
      return;
    }

    const wordBookButton = event.target.closest("[data-word-book]");
    if (wordBookButton) {
      state.preferences = { ...defaultState.preferences, ...(state.preferences || {}), wordBookId: wordBookButton.dataset.wordBook };
      state.cardIndex = 0;
      state.practiceIndex = 0;
      state.libraryPage = 0;
      state.dailyPath = createDailyPath();
      saveState();
      renderAll();
      setView("library");
      return;
    }

    const practiceButton = clickedChoiceButton?.closest("#practiceChoiceList") ? clickedChoiceButton : null;
    if (practiceButton) {
      answerPractice(practiceButton);
      return;
    }

    const mistakeFilterButton = event.target.closest("[data-mistake-filter]");
    if (mistakeFilterButton) {
      state.mistakeFilter = mistakeFilterButton.dataset.mistakeFilter;
      saveState();
      renderMistakes();
      return;
    }

    const deleteWordButton = event.target.closest("[data-delete-word]");
    if (deleteWordButton) {
      const word = deleteWordButton.dataset.deleteWord;
      openConfirmDialog({
        title: "删除自定义单词",
        message: `确定删除 ${word} 吗？这个单词的学习进度也会被移除。`,
        action: () => deleteCustomWord(word),
      });
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite-word]");
    if (favoriteButton) {
      toggleFavoriteWord(favoriteButton.dataset.favoriteWord);
      return;
    }

    const wordButton = event.target.closest("[data-card-index]");
    if (wordButton) {
      state.cardIndex = Number(wordButton.dataset.cardIndex);
      saveState();
      renderFlashcard();
      if (wordButton.closest("#libraryList")) {
        setView("vocabulary");
      }
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
      const correct = activePack().readingAnswer;
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

  document.addEventListener("keydown", (event) => {
    const speakTextButton = event.target.closest("[data-speak-text]");
    if (speakTextButton) {
      speakOnKeyboard(event, () => speak(speakTextButton.dataset.speakText));
    }
  });

  on("#homeWordSearchForm", "submit", searchHomeWord);
  on("#checkInButton", "click", checkInToday);
  on("#practiceChoiceList", "click", (event) => {
    const practiceButton = event.target.closest(".choice-button");
    if (practiceButton) {
      event.stopPropagation();
      answerPractice(practiceButton);
    }
  });
  on("#nextPracticeButton", "click", nextPracticeQuestion);
  on("#practiceWord", "click", speakCurrentPracticeWord);
  on("#practiceWord", "keydown", (event) => speakOnKeyboard(event, speakCurrentPracticeWord));
  on("#cancelDialogButton", "click", closeConfirmDialog);
  on("#confirmDialogButton", "click", confirmDialogAction);
  on("#prevCardButton", "click", () => changeCard(-1));
  on("#nextCardButton", "click", () => changeCard(1));
  on("#knowCardButton", "click", markKnown);
  on("#cardWord", "click", speakCurrentCardWord);
  on("#cardWord", "keydown", (event) => speakOnKeyboard(event, speakCurrentCardWord));
  on("#playListeningButton", "click", () => {
    const sentences = activeListeningSentences();
    speak(sentences[state.listeningIndex % sentences.length]);
  });
  on("#nextListeningButton", "click", () => {
    state.listeningIndex = (state.listeningIndex + 1) % activeListeningSentences().length;
    saveState();
    renderListening();
  });
  on("#checkDictationButton", "click", checkDictation);
  on("#librarySearchInput", "input", () => {
    state.libraryPage = 0;
    renderLibrary();
  });
  on("#libraryLevelFilter", "change", () => {
    state.libraryPage = 0;
    renderLibrary();
  });
  on("#prevLibraryPageButton", "click", () => changeLibraryPage(-1));
  on("#nextLibraryPageButton", "click", () => changeLibraryPage(1));
  on("#lookupForm", "submit", lookupText);
  on("#clearLookupButton", "click", clearLookup);
  on("#speakLookupButton", "click", () => speak($("#lookupInput")?.value.trim() || ""));
  on("#addWordForm", "submit", addCustomWord);
  on("#importWordBookButton", "click", importBulkWords);
  $$("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  on("#sendCodeButton", "click", sendVerificationCode);
  on("#authForm", "submit", submitAuth);
  on("#authButton", "click", openAccountEntry);
  on("#settingsButton", "click", () => setView("settings"));
  on("#openAuthButton", "click", () => setView("auth"));
  on("#logoutButton", "click", logout);
  ["#targetLanguageSelect", "#dailyGoalInput", "#autoSpeakToggle", "#reminderToggle"].forEach((selector) => {
    $(selector).addEventListener("change", savePreferences);
  });
  on("#adminWordForm", "submit", addAdminWord);
  on("#addNoteButton", "click", addNote);
  on("#noteInput", "keydown", (event) => {
    if (event.key === "Enter") {
      addNote();
    }
  });
  on("#playSpeakingButton", "click", () => {
    const phrases = activeSpeakingPhrases();
    speak(phrases[state.speakingIndex % phrases.length]);
  });
  on("#recordButton", "click", toggleRecording);
}

function bindCheckInPopover() {
  const panel = $(".streak-panel");
  const popover = $(".check-in-popover");
  if (!panel || !popover) {
    return;
  }
  const show = () => popover.classList.add("show");
  const hide = () => popover.classList.remove("show");
  ["mouseenter", "pointerenter", "mouseover", "focusin"].forEach((eventName) => {
    panel.addEventListener(eventName, show);
  });
  ["mouseleave", "pointerleave", "mouseout", "focusout"].forEach((eventName) => {
    panel.addEventListener(eventName, hide);
  });
}

function renderAll() {
  updateMetrics();
  renderWordBooks();
  renderDailyPath();
  renderSyncStatus();
  renderTasks();
  renderReviewQueue();
  renderQuiz();
  renderPracticeQuiz();
  renderMistakes();
  renderDesktopDashboard();
  renderFlashcard();
  renderLibrary();
  renderListening();
  renderReading();
  renderSpeaking();
  renderUser();
  renderProfileDashboard();
  renderFavorites();
  renderAdmin();
  setAuthMode(state.authMode || "login", { persist: false });
  applyPreferences();
  if (!isAuthenticated()) {
    setView("auth");
  }
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  if (isLocalHost) {
    const reloadKey = "linguaflow-local-sw-reload";
    Promise.all([
      navigator.serviceWorker
        .getRegistrations?.()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
      "caches" in window ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))) : Promise.resolve(),
    ]).then(() => {
      if (navigator.serviceWorker.controller && sessionStorage.getItem(reloadKey) !== "done") {
        sessionStorage.setItem(reloadKey, "done");
        location.reload();
      } else {
        sessionStorage.removeItem(reloadKey);
      }
    });
  } else {
    navigator.serviceWorker.register("./sw.js");
  }
}

bindEvents();
bindCheckInPopover();
renderAll();
initializeRemoteState();
