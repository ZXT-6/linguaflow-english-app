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
import { getIdentityUser, loadRemoteState, saveRemoteState, mergeRemoteState } from "./sync-client.mjs";
import {
  getSupabase,
  supabaseLogin,
  supabaseRegister,
  supabaseLogout,
  getCurrentUser,
  getProfile,
  updateProfile,
  loadUserProgress,
  saveUserProgress,
  loadUserFavorites,
  addUserFavorite,
  removeUserFavorite,
  loadUserCheckins,
  addUserCheckin,
  loadUserStats,
  saveUserStats,
  getVocabularyByBookId,
  getAllBooks,
} from "./supabase-client.js";

const STORAGE_KEY = "linguaflow-state-v1";
const LIBRARY_PAGE_SIZE = 20;
const USE_SUPABASE = Boolean(
  typeof window !== "undefined" &&
  window.__LINGUAFLOW_SUPABASE_URL__ &&
  window.__LINGUAFLOW_SUPABASE_URL__ !== "https://YOUR_PROJECT_ID.supabase.co"
);
const USE_NETLIFY_BACKEND = Boolean(
  !USE_SUPABASE &&
  typeof window !== "undefined" &&
  window.location?.protocol !== "file:" &&
  !["localhost", "127.0.0.1", "::1"].includes(window.location?.hostname)
);
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

const extraMockWords = [
  { word: "research", phonetic: "/rɪˈsɜːrtʃ/", meaning: "研究；调查", example: "Good research makes your answer stronger.", level: "B2", category: "academic" },
  { word: "require", phonetic: "/rɪˈkwaɪər/", meaning: "需要；要求", example: "This task requires careful listening.", level: "B1", category: "academic" },
  { word: "imagine", phonetic: "/ɪˈmædʒɪn/", meaning: "想象", example: "Imagine using this word in a real talk.", level: "B1", category: "daily" },
  { word: "organize", phonetic: "/ˈɔːrɡənaɪz/", meaning: "组织；整理", example: "Organize your notes before review.", level: "B1", category: "study" },
  { word: "decision", phonetic: "/dɪˈsɪʒn/", meaning: "决定", example: "Make a small decision to study today.", level: "B1", category: "daily" },
  { word: "notice", phonetic: "/ˈnoʊtɪs/", meaning: "注意到；通知", example: "Notice how the word is used.", level: "A2", category: "daily" },
  { word: "prepare", phonetic: "/prɪˈper/", meaning: "准备", example: "Prepare five words before class.", level: "A2", category: "study" },
  { word: "connect", phonetic: "/kəˈnekt/", meaning: "连接；联系", example: "Connect the word with an example.", level: "B1", category: "study" },
  { word: "discover", phonetic: "/dɪˈskʌvər/", meaning: "发现", example: "Discover one new phrase each day.", level: "B1", category: "daily" },
  { word: "express", phonetic: "/ɪkˈspres/", meaning: "表达", example: "Express your idea in simple English.", level: "B1", category: "speaking" },
  { word: "manage", phonetic: "/ˈmænɪdʒ/", meaning: "管理；设法做到", example: "Manage your study time well.", level: "B1", category: "study" },
  { word: "reduce", phonetic: "/rɪˈduːs/", meaning: "减少", example: "Reduce mistakes with regular review.", level: "B1", category: "study" },
  { word: "increase", phonetic: "/ɪnˈkriːs/", meaning: "增加；提高", example: "Increase your vocabulary step by step.", level: "B1", category: "study" },
  { word: "prefer", phonetic: "/prɪˈfɜːr/", meaning: "更喜欢", example: "I prefer short lessons in the morning.", level: "A2", category: "daily" },
  { word: "complete", phonetic: "/kəmˈpliːt/", meaning: "完成；完整的", example: "Complete today's review before dinner.", level: "A2", category: "study" },
  { word: "repeat", phonetic: "/rɪˈpiːt/", meaning: "重复", example: "Repeat the word after the audio.", level: "A1", category: "study" },
  { word: "collect", phonetic: "/kəˈlekt/", meaning: "收集", example: "Collect useful phrases in your notebook.", level: "A2", category: "study" },
  { word: "select", phonetic: "/sɪˈlekt/", meaning: "选择", example: "Select the correct Chinese meaning.", level: "A2", category: "quiz" },
  { word: "define", phonetic: "/dɪˈfaɪn/", meaning: "定义；解释", example: "Define the word in your own way.", level: "B1", category: "academic" },
  { word: "apply", phonetic: "/əˈplaɪ/", meaning: "应用；申请", example: "Apply this phrase in a sentence.", level: "B1", category: "academic" },
  { word: "attend", phonetic: "/əˈtend/", meaning: "参加；出席", example: "Attend the lesson with a clear goal.", level: "B1", category: "school" },
  { word: "balance", phonetic: "/ˈbæləns/", meaning: "平衡", example: "Balance listening and speaking practice.", level: "B1", category: "study" },
  { word: "benefit", phonetic: "/ˈbenɪfɪt/", meaning: "好处；受益", example: "Daily practice brings a real benefit.", level: "B1", category: "academic" },
  { word: "detail", phonetic: "/ˈdiːteɪl/", meaning: "细节", example: "Listen for one important detail.", level: "B1", category: "listening" },
  { word: "effort", phonetic: "/ˈefərt/", meaning: "努力", example: "Small effort every day matters.", level: "A2", category: "study" },
  { word: "energy", phonetic: "/ˈenərdʒi/", meaning: "精力；能量", example: "Study when your energy is high.", level: "A2", category: "daily" },
  { word: "future", phonetic: "/ˈfjuːtʃər/", meaning: "未来", example: "Your future self will thank you.", level: "A2", category: "daily" },
  { word: "guide", phonetic: "/ɡaɪd/", meaning: "指导；指南", example: "Use the path as a study guide.", level: "A2", category: "study" },
  { word: "identify", phonetic: "/aɪˈdentɪfaɪ/", meaning: "识别；确认", example: "Identify the word from the audio.", level: "B2", category: "listening" },
  { word: "include", phonetic: "/ɪnˈkluːd/", meaning: "包括", example: "Include one example in your answer.", level: "A2", category: "academic" },
  { word: "knowledge", phonetic: "/ˈnɑːlɪdʒ/", meaning: "知识", example: "Review turns memory into knowledge.", level: "B1", category: "academic" },
  { word: "limit", phonetic: "/ˈlɪmɪt/", meaning: "限制；限度", example: "Limit distractions while studying.", level: "B1", category: "study" },
  { word: "memory", phonetic: "/ˈmeməri/", meaning: "记忆", example: "Examples help your memory.", level: "A2", category: "study" },
  { word: "observe", phonetic: "/əbˈzɜːrv/", meaning: "观察", example: "Observe the spelling carefully.", level: "B1", category: "academic" },
  { word: "purpose", phonetic: "/ˈpɜːrpəs/", meaning: "目的", example: "Know the purpose of each exercise.", level: "B1", category: "academic" },
  { word: "quality", phonetic: "/ˈkwɑːləti/", meaning: "质量", example: "Focus on quality, not only speed.", level: "B1", category: "study" },
  { word: "reflect", phonetic: "/rɪˈflekt/", meaning: "反思；反映", example: "Reflect on mistakes after practice.", level: "B2", category: "review" },
  { word: "resource", phonetic: "/ˈriːsɔːrs/", meaning: "资源", example: "Use one resource at a time.", level: "B1", category: "study" },
  { word: "routine", phonetic: "/ruːˈtiːn/", meaning: "惯例；日常流程", example: "Build a calm study routine.", level: "B1", category: "daily" },
  { word: "skill", phonetic: "/skɪl/", meaning: "技能", example: "Spelling is a useful skill.", level: "A2", category: "study" },
  { word: "task", phonetic: "/tæsk/", meaning: "任务", example: "Finish one task before the next.", level: "A2", category: "study" },
  { word: "value", phonetic: "/ˈvæljuː/", meaning: "价值", example: "Review gives value to mistakes.", level: "B1", category: "review" },
  { word: "visual", phonetic: "/ˈvɪʒuəl/", meaning: "视觉的", example: "A visual chart shows your progress.", level: "B1", category: "dashboard" },
  { word: "weekly", phonetic: "/ˈwiːkli/", meaning: "每周的", example: "Check your weekly learning trend.", level: "A2", category: "dashboard" },
  { word: "careful", phonetic: "/ˈkerfəl/", meaning: "仔细的；谨慎的", example: "Be careful with spelling.", level: "A2", category: "study" },
  { word: "clear", phonetic: "/klɪr/", meaning: "清楚的", example: "Give a clear answer.", level: "A1", category: "daily" },
  { word: "calm", phonetic: "/kɑːm/", meaning: "平静的", example: "A calm place helps you learn.", level: "A2", category: "daily" },
  { word: "deep", phonetic: "/diːp/", meaning: "深入的；深的", example: "Deep review helps difficult words.", level: "A2", category: "review" },
  { word: "fresh", phonetic: "/freʃ/", meaning: "新鲜的；清新的", example: "Start with a fresh mind.", level: "A2", category: "daily" },
  { word: "steady", phonetic: "/ˈstedi/", meaning: "稳定的", example: "Steady practice creates progress.", level: "B1", category: "study" },
];

words.push(...extraMockWords);

function createMockWordProgress() {
  const now = new Date();
  return Object.fromEntries(
    words.slice(0, 60).map((item, index) => {
      const mastery = index % 6 === 0 ? 1 : index % 5 === 0 ? 2 : index % 4 === 0 ? 4 : 3;
      return [
        normalizeWord(item.word),
        {
          word: normalizeWord(item.word),
          correct: 2 + (index % 4),
          wrong: index % 7 === 0 ? 1 : 0,
          mastery,
          lastStudiedAt: new Date(now.getTime() - index * 36 * 60 * 60 * 1000).toISOString(),
          nextReviewAt: new Date(now.getTime() + (index % 5) * 8 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }),
  );
}

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
  authToken: null,
  registeredUsers: [],
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
  reviewMode: false,
  reviewTargetWord: null,
  libraryPage: 0,
  libraryMode: "catalog",
  mistakeFilter: "all",
  listeningIndex: 0,
  speakingIndex: 0,
  notes: [],
  streak: 1,
};

let state = loadState();
let recordingInterval = null;
let recordingSeconds = 0;
let remoteSaveTimer = null;
let pendingConfirmAction = null;
let practiceAdvanceTimer = null;
let adminUsers = [];
let adminUsersLoading = false;
let remoteWordBooks = [];
let remoteBookWords = {};
let remoteBookLoadState = {};

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
    id: user.id || user.phone || user.username || user.name || user.email || `local-${Date.now()}`,
  };
  return {
    ...normalized,
    profile: createUserProfile(normalized),
  };
}

function isAdminUser() {
  if (USE_SUPABASE && state.authUser) {
    return state.authUser.role === "admin";
  }
  return state.authUser?.role === "admin";
}

function isAuthenticated() {
  return Boolean(state.authUser);
}

function currentLanguageKey() {
  const key = state.preferences?.targetLanguage || defaultState.preferences.targetLanguage;
  return languagePacks[key] ? key : defaultState.preferences.targetLanguage;
}

function activePack() {
  return languagePacks[currentLanguageKey()] || languagePacks.en;
}

function activeListeningSentences() {
  const pack = activePack();
  return Array.isArray(pack.listening) && pack.listening.length ? pack.listening : listeningSentences;
}

function activeSpeakingPhrases() {
  const pack = activePack();
  return Array.isArray(pack.speaking) && pack.speaking.length ? pack.speaking : speakingPhrases;
}

async function backendAuth(mode, { username, email, password }) {
  const response = await fetch(`/api/auth/${mode}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "账号服务暂时不可用。");
  }
  return payload;
}

function normalizeRemoteWordBook(book) {
  return {
    id: book.id,
    title: book.title || book.id,
    tag: book.tag || book.level || "词书",
    description: book.description || "Supabase 云端词书。",
    wordNames: null,
    remote: true,
  };
}

function selectableWordBooks() {
  if (currentLanguageKey() !== "en") {
    const pack = activePack();
    return [{ id: "general", title: pack.label, tag: "语言", description: "当前语言内置词库。", wordNames: null }];
  }
  return remoteWordBooks.length ? remoteWordBooks : wordBooks;
}

function currentBookId() {
  const preferred = state.preferences?.wordBookId || defaultState.preferences.wordBookId;
  return selectableWordBooks().some((book) => book.id === preferred) ? preferred : "general";
}

function activeWordBook() {
  return selectableWordBooks().find((book) => book.id === currentBookId()) || selectableWordBooks()[0] || wordBooks[0];
}

function builtInWordsForBook(bookId) {
  const book = wordBooks.find((item) => item.id === bookId) || wordBooks[0];
  if (!book?.wordNames) {
    return words;
  }
  const names = new Set(book.wordNames.map(normalizeWord));
  return words.filter((item) => names.has(normalizeWord(item.word)));
}

function customWordsForBook(bookId) {
  return (state.customWords || []).filter((item) => {
    const languageMatches = (item.language || "en") === currentLanguageKey();
    const bookMatches = currentLanguageKey() !== "en" || !item.bookId || item.bookId === bookId;
    return languageMatches && bookMatches;
  });
}

function wordsForBook(bookId) {
  if (currentLanguageKey() !== "en") {
    return activePack().words;
  }
  const baseWords = Object.prototype.hasOwnProperty.call(remoteBookWords, bookId)
    ? remoteBookWords[bookId]
    : builtInWordsForBook(bookId);
  return [...baseWords, ...customWordsForBook(bookId)];
}

function allWords() {
  const book = activeWordBook();
  if (currentLanguageKey() !== "en") {
    return [...activePack().words, ...customWordsForBook(book.id)];
  }
  return wordsForBook(book.id);
}

async function loadRemoteWordBooks() {
  if (!USE_SUPABASE || currentLanguageKey() !== "en") {
    return;
  }
  try {
    const books = await getAllBooks();
    remoteWordBooks = books.map(normalizeRemoteWordBook).filter((book) => book.id);
    if (!remoteWordBooks.some((book) => book.id === currentBookId())) {
      state.preferences = { ...defaultState.preferences, ...(state.preferences || {}), wordBookId: remoteWordBooks[0]?.id || "general" };
    }
  } catch (error) {
    console.warn("加载 Supabase 词书失败:", error.message);
    remoteWordBooks = [];
  }
}

async function ensureRemoteBookWords(bookId = currentBookId()) {
  if (!USE_SUPABASE || currentLanguageKey() !== "en" || !remoteWordBooks.length) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(remoteBookWords, bookId) || remoteBookLoadState[bookId] === "loading") {
    return;
  }
  remoteBookLoadState[bookId] = "loading";
  try {
    const loadedWords = await getVocabularyByBookId(bookId);
    remoteBookWords = { ...remoteBookWords, [bookId]: loadedWords };
    remoteBookLoadState[bookId] = "loaded";
    renderAll();
  } catch (error) {
    remoteBookLoadState[bookId] = "failed";
    console.warn("加载 Supabase 词条失败:", error.message);
  }
}

function progressFor(word) {
  return (state.wordProgress || {})[normalizeWord(word)] || null;
}

function recordWordStudy(word, correct) {
  state.wordProgress = updateWordProgress(state.wordProgress || {}, word, correct);
  if (USE_SUPABASE && isAuthenticated()) {
    const p = state.wordProgress[normalizeWord(word)];
    if (p) {
      saveUserProgress(state.authUser.id, word, p).catch(() => {});
    }
  }
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
  const wasFav = isFavoriteWord(word);
  state.favoriteWords = wasFav ? favorites.filter((item) => normalizeWord(item) !== key) : [word, ...favorites];
  saveState();
  renderFlashcard();
  renderFavorites();
  if (USE_SUPABASE && isAuthenticated()) {
    const userId = state.authUser.id;
    if (wasFav) {
      removeUserFavorite(userId, word).catch(() => {});
    } else {
      addUserFavorite(userId, word).catch(() => {});
    }
  }
}

function tokenizeEnglish(text) {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function illustratedEmptyState(message, illustration = "empty-notebook.svg", alt = "学习手账线稿插画") {
  return `
    <div class="empty-state illustrated-empty">
      <img class="empty-illustration" src="./assets/${illustration}" alt="${escapeHtml(alt)}" />
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^1\d{10}$/.test(value);
}

function localPasswordHash(password) {
  return String(hashText(`linguaflow:${password}`));
}

function findRegisteredUser(identifier) {
  const key = normalizeWord(identifier || "");
  return (state.registeredUsers || []).find((user) =>
    normalizeWord(user.username || "") === key || normalizeWord(user.email || "") === key,
  ) || null;
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
    registeredUsers: Array.isArray(value.registeredUsers) ? value.registeredUsers : [],
    authToken: typeof value.authToken === "string" ? value.authToken : null,
    authUser: normalizeAuthUser(value.authUser),
    preferences: { ...defaultState.preferences, ...(value.preferences || {}) },
    libraryMode: value.libraryMode === "words" ? "words" : "catalog",
    reviewMode: Boolean(value.reviewMode && value.reviewTargetWord),
    reviewTargetWord: value.reviewTargetWord || null,
    minutes: Number(value.minutes || 0),
    wordsLearned: Number(value.wordsLearned || 0),
    answers: Array.isArray(value.answers) ? value.answers : [],
    knownWords: Array.isArray(value.knownWords) ? value.knownWords : [],
    wordProgress: value.wordProgress && Object.keys(value.wordProgress).length > 0 ? value.wordProgress : {},
    dailyPath: ensureDailyPath(value.dailyPath, new Date().toISOString().slice(0, 10)),
    sync: { ...createSyncState(), ...(value.sync || {}) },
  };
}

function saveState({ touch = true, remote = true } = {}) {
  if (touch) {
    state = touchLocalState(state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (remote && USE_SUPABASE && isAuthenticated()) {
    queueSupabaseSave();
  } else if (remote && USE_NETLIFY_BACKEND && isAuthenticated() && state.authToken) {
    queueRemoteSave();
  }
}

let supabaseSaveTimer = null;
function queueSupabaseSave() {
  clearTimeout(supabaseSaveTimer);
  supabaseSaveTimer = setTimeout(syncProgressToSupabase, 2000);
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
    if (USE_SUPABASE && isAuthenticated()) {
      addUserCheckin(state.authUser.id, today).catch(() => {});
    }
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
  if (viewId === "admin" && !isAdminUser()) {
    viewId = "profile";
  }

  syncAuthShell();
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
  if (viewId === "admin" && USE_NETLIFY_BACKEND && isAdminUser() && !adminUsers.length && !adminUsersLoading) {
    loadAdminUsers();
  }
}

function syncAuthShell() {
  const authenticated = isAuthenticated();
  $(".auth-shell")?.toggleAttribute("hidden", authenticated);
  $(".app-shell")?.toggleAttribute("hidden", !authenticated);
}

function openAccountEntry() {
  setView(isAuthenticated() ? "profile" : "auth");
}

function renderUserAvatar(selector, user = state.authUser) {
  const avatar = $(selector);
  if (!avatar) {
    return;
  }
  const profile = user?.profile || createUserProfile(user || {});
  avatar.textContent = profile.avatarUrl ? "" : (user ? getUserInitial(user) : "LF");
  avatar.style.setProperty("--avatar-color", profile.avatarColor);
  avatar.style.setProperty("--avatar-accent", profile.avatarAccent);
  avatar.style.backgroundImage = profile.avatarUrl ? `url("${profile.avatarUrl}")` : "";
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
  setTextIfPresent("#dashboardCommandPercent", `${dailyProgress}%`);
  if ($("#dashboardProgressRing")) {
    $("#dashboardProgressRing").style.setProperty("--progress", `${dailyProgress}%`);
  }
  if ($(".cafe-ring")) {
    $(".cafe-ring").style.setProperty("--progress", `${dailyProgress}%`);
  }
  if ($("#dashboardTaskSummary")) {
    const active = getActivePathStep(state.dailyPath);
    $("#dashboardTaskSummary").textContent = active
      ? `今日完成 ${donePathSteps}/${DAILY_PATH_STEPS.length} 项，下一步：${active.title} ${active.progress}/${active.target}`
      : `今日 ${DAILY_PATH_STEPS.length} 项任务已完成，去复盘本周学习数据。`;
  }
  if ($("#dashboardLearningStats")) {
    $("#dashboardLearningStats").innerHTML = [
      ["连续学习", `${state.streak} 天`],
      ["已学单词", `${stats.studiedWords}`],
      ["正确率", `${stats.accuracy || 0}%`],
      ["学习时长", `${state.minutes} 分钟`],
    ]
      .map((item) => `<article><strong>${item[1]}</strong><span>${item[0]}</span></article>`)
      .join("");
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
  const books = selectableWordBooks();
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
  if ($("#recentWordsList")) {
    const recentWords = Object.values(state.wordProgress || {})
      .sort((a, b) => String(b.lastStudiedAt || "").localeCompare(String(a.lastStudiedAt || "")))
      .slice(0, 5);
    const items = recentWords.length
      ? recentWords
      : allWords()
          .slice(0, 5)
          .map((word) => ({ word: word.word, mastery: 0, lastStudiedAt: "" }));
    $("#recentWordsList").innerHTML = items
      .map((item) => {
        const word = allWords().find((entry) => normalizeWord(entry.word) === normalizeWord(item.word));
        return `<article><strong>${escapeHtml(item.word)}</strong><span>${escapeHtml(word?.meaning || "待复习")}</span><em>${getMasteryLabel(item.mastery || 0)}</em></article>`;
      })
      .join("");
  }
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
  state.libraryMode = "words";
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
  if (USE_SUPABASE) {
    $("#syncStatusLabel").textContent = isAuthenticated() ? "已同步" : "离线可用";
    $("#syncDetailLabel").textContent = isAuthenticated()
      ? "学习数据已同步到云端，更换设备登录后可恢复。"
      : "学习数据已保存在本机，登录后将同步到云端。";
    $("#syncConflictPanel").hidden = true;
    $("#appStatus").hidden = true;
    return;
  }

  if (USE_NETLIFY_BACKEND) {
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
    return;
  }

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
    const result = await saveRemoteState(state, state.authToken || "");
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
  const user = USE_NETLIFY_BACKEND && state.authToken ? state.authUser : await getIdentityUser();
  if (user) {
    state.sync = { ...state.sync, status: "pending" };
    renderSyncStatus();
  }

  try {
    const remote = await loadRemoteState(state.authToken || "");
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
    : illustratedEmptyState("今天没有到期复习，继续学习新词。", "empty-review.svg", "复习笔记线稿插画");
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
    $("#choiceList").innerHTML = illustratedEmptyState("当前语言还没有可练习的单词，请先在词库或后台添加内容。", "empty-notebook.svg", "笔记本线稿插画");
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
  const reviewWord = state.reviewMode && state.reviewTargetWord
    ? wordList.find((item) => normalizeWord(item.word) === normalizeWord(state.reviewTargetWord))
    : null;
  const word = reviewWord || wordList[(state.practiceIndex || 0) % wordList.length];
  const distractors = shuffle(wordList.filter((item) => item.word !== word.word))
    .map((item) => item.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 3);
  return {
    word,
    options: shuffle([word.meaning, ...distractors]),
  };
}

function finishReviewAnswer(word, isCorrect) {
  if (!state.reviewMode || !word) {
    return;
  }
  const key = normalizeWord(word);
  const current = state.wordProgress?.[key];
  if (!current) {
    return;
  }
  const previousWrong = Number(current.wrong || 0);
  const nextWrong = isCorrect ? Math.max(0, previousWrong - 1) : previousWrong + 1;
  const reviewCorrectStreak = isCorrect ? Number(current.reviewCorrectStreak || 0) + 1 : 0;
  state.wordProgress = {
    ...(state.wordProgress || {}),
    [key]: {
      ...current,
      wrong: nextWrong,
      mastery: isCorrect && reviewCorrectStreak >= 2 ? 4 : isCorrect ? Math.max(Number(current.mastery || 0), 3) : 1,
      lastReviewedAt: new Date().toISOString(),
      lastStudiedAt: new Date().toISOString(),
      reviewCorrectStreak,
      reviewLevel: nextWrong === 0 ? "mastered" : nextWrong >= 3 ? "high" : nextWrong >= 2 ? "medium" : "normal",
      mastered: nextWrong === 0 || reviewCorrectStreak >= 2,
    },
  };
  if (isCorrect && (nextWrong === 0 || reviewCorrectStreak >= 2)) {
    state.reviewMode = false;
    state.reviewTargetWord = null;
  }
}

function startMistakeReview(word) {
  state.reviewMode = true;
  state.reviewTargetWord = normalizeWord(word);
  state.practiceMode = "choice";
  state.practiceIndex = 0;
  saveState();
  setView("practice");
  renderPracticeQuiz();
}

window.answerPracticeChoice = (button) => answerPractice(button);

function addPracticeMistake({ type, word, correct, wrong }) {
  const key = normalizeWord(word.word);
  const current = state.wordProgress?.[key] || {
    word: key,
    correct: 0,
    wrong: 0,
    mastery: 0,
  };
  const wrongCount = Number(current.wrong || 0) + 1;
  state.wordProgress = {
    ...(state.wordProgress || {}),
    [key]: {
      ...current,
      word: key,
      wrong: wrongCount,
      mastery: 1,
      lastStudiedAt: new Date().toISOString(),
      lastMistake: {
        type,
        wrong,
        correct,
        question: word.meaning,
      },
      reviewLevel: wrongCount >= 3 ? "high" : wrongCount >= 2 ? "medium" : "normal",
      mastered: false,
    },
  };
}

function renderPracticeShell(question) {
  $("#practiceCounter").textContent = `${((state.practiceIndex || 0) % 10) + 1}/10`;
  $("#practiceChoiceList").dataset.word = question.word.word;
  $("#practiceChoiceList").dataset.correct = question.word.meaning;
  $("#practiceChoiceList").dataset.correctWord = question.word.word;
  $("#practiceFeedback").textContent = "";
  $("#practiceFeedback").className = "feedback";
  $("#nextPracticeButton").hidden = true;
  $("#playPracticeAudioButton").hidden = true;
  $("#spellingPracticeForm").hidden = true;
  $("#spellingAnswerInput").disabled = false;
  $("#submitSpellingAnswerButton").disabled = false;
  $("#practiceWord").hidden = false;
  $("#practiceWord").classList.add("clickable-word");
  $("#practiceWord").setAttribute("role", "button");
  $("#practiceWord").setAttribute("tabindex", "0");
  $("#practiceExplainCard").innerHTML = `<strong>答题反馈</strong><p>完成作答后，这里会显示正确答案和复习建议。</p>`;
}

function renderChoiceQuestion(question) {
  renderPracticeShell(question);
  $("#practicePrompt").textContent = "请选择下列单词的中文意思";
  $("#practiceWord").textContent = question.word.word;
  $("#practiceChoiceList").innerHTML = question.options
    .map((option, index) => `<button class="choice-button" data-practice-answer="${escapeHtml(option)}" onpointerdown="window.answerPracticeChoice?.(this); return false;" onclick="window.answerPracticeChoice?.(this); return false;" type="button"><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></button>`)
    .join("");
}

function renderSpellingQuestion(question) {
  renderPracticeShell(question);
  $("#practicePrompt").textContent = "中文释义如下，请输入对应英文";
  $("#practiceWord").classList.remove("clickable-word");
  $("#practiceWord").removeAttribute("role");
  $("#practiceWord").removeAttribute("tabindex");
  $("#practiceWord").textContent = question.word.meaning;
  $("#practiceChoiceList").innerHTML = "";
  $("#practiceChoiceList").dataset.correct = question.word.word;
  $("#spellingPracticeForm").hidden = false;
  $("#spellingAnswerInput").value = "";
  $("#spellingAnswerInput").focus({ preventScroll: true });
}

function renderListeningChoiceQuestion(question) {
  renderPracticeShell(question);
  $("#practicePrompt").textContent = "播放单词发音，然后选择中文意思";
  $("#practiceWord").hidden = true;
  $("#playPracticeAudioButton").hidden = false;
  $("#practiceChoiceList").innerHTML = question.options
    .map((option, index) => `<button class="choice-button" data-practice-answer="${escapeHtml(option)}" type="button"><span>${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</span></button>`)
    .join("");
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
    $("#practiceChoiceList").innerHTML = illustratedEmptyState("当前语言还没有可练习的单词。", "empty-notebook.svg", "笔记本线稿插画");
    return;
  }
  if ((state.practiceMode || "choice") === "spelling") {
    renderSpellingQuestion(question);
  } else if (state.practiceMode === "listening") {
    renderListeningChoiceQuestion(question);
  } else {
    renderChoiceQuestion(question);
  }
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
  const questionWord = allWords().find((item) => normalizeWord(item.word) === normalizeWord(word)) || { word, meaning: correct, example: "" };
  const wasReviewMode = state.reviewMode;
  state.answers = [...state.answers.slice(-9), isCorrect];
  recordWordStudy(word, isCorrect);
  if (state.reviewMode) {
    finishReviewAnswer(word, isCorrect);
  } else if (!isCorrect) {
    addPracticeMistake({ type: state.practiceMode || "choice", word: questionWord, correct, wrong: button.dataset.practiceAnswer || "" });
  }
  if (isCorrect) {
    state.quizScore += 10;
    state.wordsLearned += 1;
  }
  $$("#practiceChoiceList .choice-button").forEach((item) => {
    item.disabled = isCorrect || item === button;
    item.classList.toggle("correct", item.dataset.practiceAnswer === correct);
    item.classList.toggle("wrong", item === button && !isCorrect);
  });
  $("#practiceFeedback").textContent = isCorrect ? "答对了，下一题马上开始。" : "答错了，已加入复习中心。";
  $("#practiceFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  $("#practiceExplainCard").innerHTML = `<strong>${isCorrect ? "回答正确" : "需要复习"}</strong><p>你的答案：${escapeHtml(button.dataset.practiceAnswer || "")}。正确答案：${escapeHtml(correct)}。单词解释：${escapeHtml(questionWord.meaning)}。${escapeHtml(questionWord.example || "")}</p>`;
  $("#nextPracticeButton").hidden = isCorrect && !wasReviewMode;
  saveState();
  if (isCorrect && !wasReviewMode) {
    recordDailyPathStep("review", 1, { refresh: false });
    practiceAdvanceTimer = setTimeout(nextPracticeQuestion, 650);
  } else if (isCorrect && wasReviewMode) {
    recordDailyPathStep("review", 1, { refresh: false });
  }
  updateMetrics();
  renderMistakes();
  renderDesktopDashboard();
}

function submitSpellingAnswer(event) {
  event.preventDefault();
  const correct = ($("#practiceChoiceList").dataset.correct || "").trim().toLowerCase();
  const word = $("#practiceChoiceList").dataset.word;
  const rawAnswer = $("#spellingAnswerInput").value;
  const answer = rawAnswer.trim().toLowerCase();
  const questionWord = allWords().find((item) => normalizeWord(item.word) === normalizeWord(word)) || { word, meaning: "" };
  const wasReviewMode = state.reviewMode;
  if (!answer) {
    $("#practiceFeedback").textContent = "先输入英文单词，再提交答案。";
    $("#practiceFeedback").className = "feedback bad";
    return;
  }
  const isCorrect = answer === correct;
  state.answers = [...state.answers.slice(-9), isCorrect];
  recordWordStudy(word, isCorrect);
  if (state.reviewMode) {
    finishReviewAnswer(word, isCorrect);
  } else if (!isCorrect) {
    addPracticeMistake({ type: "spelling", word: questionWord, correct: $("#practiceChoiceList").dataset.correct || "", wrong: rawAnswer.trim() });
  }
  if (isCorrect) {
    state.quizScore += 10;
    state.wordsLearned += 1;
  }
  $("#practiceFeedback").textContent = isCorrect ? "拼写正确。" : "拼写不正确，已加入复习中心。";
  $("#practiceFeedback").className = `feedback ${isCorrect ? "good" : "bad"}`;
  $("#practiceExplainCard").innerHTML = `<strong>${isCorrect ? "回答正确" : "需要复习"}</strong><p>你的答案：${escapeHtml(rawAnswer.trim())}。正确答案：${escapeHtml($("#practiceChoiceList").dataset.correct || "")}。单词解释：${escapeHtml(questionWord.meaning)}。${escapeHtml(questionWord.example || "")}</p>`;
  $("#submitSpellingAnswerButton").disabled = true;
  $("#spellingAnswerInput").disabled = true;
  $("#nextPracticeButton").hidden = isCorrect && !wasReviewMode;
  saveState();
  if (isCorrect && !wasReviewMode) {
    recordDailyPathStep("review", 1, { refresh: false });
    practiceAdvanceTimer = setTimeout(nextPracticeQuestion, 650);
  } else if (isCorrect && wasReviewMode) {
    recordDailyPathStep("review", 1, { refresh: false });
  }
  updateMetrics();
  renderMistakes();
  renderDesktopDashboard();
}

function nextPracticeQuestion() {
  if (practiceAdvanceTimer) {
    clearTimeout(practiceAdvanceTimer);
    practiceAdvanceTimer = null;
  }
  if (state.reviewMode && state.reviewTargetWord) {
    const reviewModes = ["choice", "spelling", "listening"];
    const nextModeIndex = (reviewModes.indexOf(state.practiceMode || "choice") + 1) % reviewModes.length;
    state.practiceMode = reviewModes[nextModeIndex];
  } else {
    state.practiceIndex = (state.practiceIndex || 0) + 1;
  }
  saveState();
  renderPracticeQuiz();
}

function weeklyTrendData() {
  const mock = [20, 35, 42, 30, 55, 68, 50];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const logs = Array.isArray(state.studyLogs) ? state.studyLogs : [];
  if (!logs.length) {
    return labels.map((label, index) => ({ label, minutes: mock[index] }));
  }
  const today = new Date();
  return labels.map((label, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const dayKey = day.toISOString().slice(0, 10);
    const minutes = logs
      .filter((item) => String(item.createdAt || item.date || "").slice(0, 10) === dayKey)
      .reduce((sum, item) => sum + Number(item.duration_minutes || item.minutes || 0), 0);
    return { label, minutes: minutes || mock[index] };
  });
}

function renderWeeklyTrendChart() {
  const data = weeklyTrendData();
  const width = 360;
  const height = 150;
  const padding = 28;
  const max = Math.max(...data.map((item) => item.minutes), 1);
  const points = data
    .map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1);
      const y = height - padding - (item.minutes / max) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  $("#weeklyChart").innerHTML = `
    <svg class="weekly-chart-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <polyline points="${points}" fill="none" stroke="var(--coffee)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${data
        .map((item, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return `<circle cx="${x}" cy="${y}" r="4.5"></circle>`;
        })
        .join("")}
    </svg>
    <div class="weekly-chart-labels">
      ${data.map((item) => `<span><strong>${item.minutes}</strong><small>${item.label}</small></span>`).join("")}
    </div>
  `;
  setTextIfPresent("#weeklyHoursMetric", `${(data.reduce((sum, item) => sum + item.minutes, 0) / 60).toFixed(1)} 小时`);
}

function mistakeItems() {
  const fromProgress = Object.values(state.wordProgress || {})
    .filter((item) => Number(item.wrong || 0) > 0)
    .map((item) => {
      const word = allWords().find((entry) => normalizeWord(entry.word) === normalizeWord(item.word)) || {};
      const lastMistake = item.lastMistake || {};
      const wrongCount = Number(item.wrong || 0);
      return {
        type: lastMistake.type || "word",
        title: item.word,
        phonetic: word.phonetic || "",
        meaning: word.meaning || "待复习单词",
        correct: lastMistake.correct || word.meaning || "正确答案",
        wrong: lastMistake.wrong || "上次答错",
        date: item.lastStudiedAt?.slice(0, 10) || "2026-06-06",
        wrongCount,
        reviewLevel: item.reviewLevel || (wrongCount >= 3 ? "high" : wrongCount >= 2 ? "medium" : "normal"),
        mastered: Boolean(item.mastered || item.mastery >= 4),
      };
    });
  const fallback = [
    { type: "word", title: "abandon", phonetic: "/əˈbændən/", meaning: "v. 放弃；抛弃", correct: "放弃", wrong: "保留", date: "2026-06-01", wrongCount: 3, reviewLevel: "high", mastered: false },
    { type: "choice", title: "convenient", phonetic: "/kənˈviːniənt/", meaning: "adj. 方便的；便利的", correct: "方便的", wrong: "复杂的", date: "2026-06-02", wrongCount: 2, reviewLevel: "medium", mastered: false },
    { type: "spelling", title: "happy", phonetic: "/ˈhæpi/", meaning: "adj. 快乐的", correct: "happy", wrong: "hapy", date: "2026-06-03", wrongCount: 1, reviewLevel: "normal", mastered: true },
    { type: "listening", title: "environment", phonetic: "/ɪnˈvaɪrənmənt/", meaning: "n. 环境；周围的事物", correct: "环境", wrong: "设备", date: "2026-06-04", wrongCount: 2, reviewLevel: "medium", mastered: false },
  ];
  return fromProgress.length ? fromProgress : fallback;
}

function renderMistakes() {
  const filter = state.mistakeFilter || "all";
  $$("[data-mistake-filter]").forEach((button) => button.classList.toggle("active", button.dataset.mistakeFilter === filter));
  const allItems = mistakeItems();
  const items = allItems.filter((item) => filter === "all" || item.type === filter);
  const stats = calculateLearningStats(allWords(), state.wordProgress || {}, state.answers || []);
  const highFrequency = allItems.filter((item) => item.wrongCount >= 2).length;
  if ($("#mistakeStatsGrid")) {
    $("#mistakeStatsGrid").innerHTML = [
      ["今日建议复习", `${Math.min(5, allItems.filter((item) => !item.mastered).length)}`],
      ["高频错误词", `${highFrequency}`],
      ["本周复习次数", `${Math.max(7, allItems.reduce((sum, item) => sum + item.wrongCount, 0))}`],
      ["正确率", `${stats.accuracy || 85}%`],
    ]
      .map((item) => `<article><strong>${item[1]}</strong><span>${item[0]}</span></article>`)
      .join("");
  }
  $("#mistakeList").innerHTML = items.length
    ? items
        .map(
          (item) => `
        <article class="mistake-item">
          <button class="star-button" type="button" aria-label="收藏">☆</button>
          <strong class="clickable-word" role="button" tabindex="0" data-speak-text="${escapeHtml(item.title)}" title="点击朗读" aria-label="点击朗读 ${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.phonetic)}</span>
          <p>${escapeHtml(item.meaning)}</p>
          <small>错误次数：${item.wrongCount}</small>
          <small>最近错误时间：${escapeHtml(item.date)}</small>
          <small>建议复习等级：${item.reviewLevel === "high" ? "重点复习" : item.reviewLevel === "medium" ? "加强复习" : "常规复习"}</small>
          <small>掌握状态：${item.mastered ? "已掌握" : "未掌握"}</small>
          <small>你的答案：${escapeHtml(item.wrong)}</small>
          <em>正确答案：${escapeHtml(item.correct)}</em>
          <div class="mistake-actions">
            <button class="secondary-button compact-button" type="button" data-review-word="${escapeHtml(item.title)}">重新复习</button>
            <button class="secondary-button compact-button" type="button" data-master-mistake="${escapeHtml(item.title)}">标记已掌握</button>
          </div>
        </article>
      `,
        )
        .join("")
    : illustratedEmptyState("当前筛选下暂无错题。", "empty-review.svg", "复习笔记线稿插画");
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
  renderWeeklyTrendChart();
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
    : `<div class="favorite-empty">${illustratedEmptyState("还没有收藏单词。遇到想反复看的单词时，点单词卡右下角的星星就会放进这里。", "empty-bookmark.svg", "书签和词典线稿插画")}</div>`;
}

function renderLibrary() {
  const isCatalog = state.libraryMode !== "words";
  const toolbar = $(".library-toolbar");
  const pagination = $("#libraryPagination");
  const side = $(".library-side");
  const backButton = $("#backToWordBookCatalogButton");

  toolbar?.toggleAttribute("hidden", isCatalog);
  side?.toggleAttribute("hidden", isCatalog);
  backButton?.toggleAttribute("hidden", isCatalog);

  if (isCatalog) {
    renderLibraryCatalog();
    return;
  }

  ensureRemoteBookWords().catch(() => {});
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
  pagination.hidden = filtered.length <= LIBRARY_PAGE_SIZE;
  $("#libraryPageLabel").textContent = `${state.libraryPage + 1}/${totalPages}`;
  $("#prevLibraryPageButton").disabled = state.libraryPage <= 0;
  $("#nextLibraryPageButton").disabled = state.libraryPage >= totalPages - 1;
  if (!filtered.length) {
    $("#libraryList").innerHTML = illustratedEmptyState("没有找到匹配单词。", "empty-notebook.svg", "笔记本线稿插画");
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

function renderLibraryCatalog() {
  const books = selectableWordBooks();
  setTextIfPresent("#libraryTitle", "词库");
  setTextIfPresent("#libraryCountLabel", `${books.length} 本词书`);
  $("#libraryList").innerHTML = `
    <div class="library-book-grid">
      ${books
        .map((book) => {
          const bookWords = currentLanguageKey() === "en" ? wordsForBook(book.id) : allWords();
          const studied = bookWords.filter((item) => progressFor(item.word)).length;
          return `
            <button class="library-book-card ${book.id === currentBookId() ? "active" : ""}" data-word-book="${escapeHtml(book.id)}" type="button">
              <span>${escapeHtml(book.tag)}</span>
              <strong>${escapeHtml(book.title)}</strong>
              <small>${escapeHtml(book.description)}</small>
              <em>${bookWords.length} 个单词</em>
              <small>${studied}/${bookWords.length} 已学习</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
  $("#libraryPagination").hidden = true;
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

function changeCard(delta) {
  const wordList = allWords();
  state.cardIndex = (state.cardIndex + delta + wordList.length) % wordList.length;
  saveState();
  renderFlashcard();
}

function markWordWithConfidence(level) {
  const wordList = allWords();
  if (!wordList.length) {
    return;
  }
  const word = wordList[state.cardIndex % wordList.length].word;
  if (level === "unknown") {
    recordWordStudy(word, false);
  } else {
    recordWordStudy(word, true);
  }
  if (level === "known" && !state.knownWords.includes(word)) {
    state.knownWords.push(word);
    state.wordsLearned += 1;
  }
  state.minutes += level === "unknown" ? 0 : 1;
  saveState();
  recordDailyPathStep("newWords", level === "known" ? 1 : 0, { refresh: false });
  updateMetrics();
  renderLibrary();
  renderMistakes();
  renderReviewQueue();
  changeCard(1);
}

function markKnown() {
  markWordWithConfidence("known");
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
    : illustratedEmptyState("暂无听力素材，请先在后台或词库中添加练习内容。", "empty-notebook.svg", "笔记本线稿插画");
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
    : illustratedEmptyState("还没有生词摘录。阅读时输入生词或短语，会保存在这里。", "empty-bookmark.svg", "书签和词典线稿插画");
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
    : illustratedEmptyState("暂无口语素材，请先添加场景表达。", "empty-notebook.svg", "笔记本线稿插画");
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
  const isReset = mode === "reset";
  $("#authForm").hidden = isReset;
  $("#resetPasswordForm").hidden = !isReset;
  $$("[data-auth-mode]").forEach((button) => {
    if (!isReset) button.classList.toggle("active", button.dataset.authMode === mode);
  });
  $("#authModeLabel").textContent = USE_SUPABASE
    ? (mode === "register" ? "邮箱注册" : "邮箱登录")
    : USE_NETLIFY_BACKEND
      ? (mode === "register" ? "邮箱注册" : "邮箱登录")
      : (mode === "register" ? "邮箱注册" : "账号登录");
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
  if (USE_SUPABASE || USE_NETLIFY_BACKEND) {
    $("#authUsernameInput").required = true;
    const emailInput = $("#authEmailInput");
    if (emailInput) emailInput.required = mode === "register";
    $("#authCodeInput").required = false;
    $$("[data-auth-field='register']").forEach((field) => {
      if (field.querySelector("#authCodeInput")) {
        field.hidden = true;
      }
    });
  } else {
    $("#authUsernameInput").required = true;
    const phoneInput = $("#authPhoneInput");
    if (phoneInput) phoneInput.required = mode === "register";
    const codeInput = $("#authCodeInput");
    if (codeInput) codeInput.required = mode === "register";
  }
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
  if (USE_SUPABASE) {
    return;
  }
  const username = $("#authUsernameInput").value.trim();
  const email = $("#authEmailInput").value.trim();
  const feedback = $("#authFeedback");
  if (username.length < 2 || !isValidEmail(email)) {
    feedback.textContent = "请先填写用户名和有效邮箱。";
    feedback.className = "feedback bad";
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.pendingCode = { username, email, code, expiresAt: Date.now() + 5 * 60 * 1000 };
  saveState();
  feedback.textContent = `验证码已生成：${code}。接入后端后这里会改为邮箱发送。`;
  feedback.className = "feedback good";
}

function showResetPassword() {
  setAuthMode("reset");
  $("#resetEmailInput").value = "";
  $("#resetCodeInput").value = "";
  $("#resetNewPasswordInput").value = "";
  $("#resetFeedback").textContent = "";
  $("#resetFeedback").className = "feedback";
}

function showAuthForm() {
  setAuthMode(state.authMode || "login");
  $("#authFeedback").textContent = "";
  $("#authFeedback").className = "feedback";
}

async function sendResetCode() {
  const email = $("#resetEmailInput").value.trim();
  const feedback = $("#resetFeedback");
  if (!email || !isValidEmail(email)) {
    feedback.textContent = "请输入有效的注册邮箱。";
    feedback.className = "feedback bad";
    return;
  }
  if (USE_SUPABASE) {
    feedback.textContent = "正在发送重置邮件...";
    feedback.className = "feedback";
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      feedback.textContent = "已发送密码重置链接到你的邮箱，请查收邮件并点击链接重置密码。";
      feedback.className = "feedback good";
    } catch (err) {
      feedback.textContent = `发送失败：${err.message}`;
      feedback.className = "feedback bad";
    }
    return;
  }
  if (USE_NETLIFY_BACKEND) {
    feedback.textContent = "正在发送重置邮件...";
    feedback.className = "feedback";
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "发送失败");
      feedback.textContent = payload.message || "已发送重置验证码到你的邮箱。";
      feedback.className = "feedback good";
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = "feedback bad";
    }
    return;
  }
  const account = findRegisteredUser(email);
  if (!account) {
    feedback.textContent = "该邮箱未注册，请先注册账号。";
    feedback.className = "feedback bad";
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  state.pendingCode = { username: account.username, email, code, expiresAt: Date.now() + 5 * 60 * 1000 };
  saveState();
  feedback.textContent = `验证码已生成：${code}（本地测试模式）`;
  feedback.className = "feedback good";
}

async function submitResetPassword(event) {
  event.preventDefault();
  const email = $("#resetEmailInput").value.trim();
  const code = $("#resetCodeInput").value.trim();
  const newPassword = $("#resetNewPasswordInput").value.trim();
  const feedback = $("#resetFeedback");
  if (!email || !isValidEmail(email)) {
    feedback.textContent = "请输入有效的注册邮箱。";
    feedback.className = "feedback bad";
    return;
  }
  if (newPassword.length < 6) {
    feedback.textContent = "新密码至少需要 6 位字符。";
    feedback.className = "feedback bad";
    return;
  }
  if (USE_SUPABASE) {
    feedback.textContent = "请使用邮箱中收到的重置链接来重置密码。";
    feedback.className = "feedback";
    return;
  }
  if (USE_NETLIFY_BACKEND) {
    feedback.textContent = "正在重置密码...";
    feedback.className = "feedback";
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "重置失败");
      feedback.textContent = "密码已重置，请使用新密码登录。";
      feedback.className = "feedback good";
      setTimeout(showAuthForm, 2000);
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = "feedback bad";
    }
    return;
  }
  const account = findRegisteredUser(email);
  if (!account) {
    feedback.textContent = "该邮箱未注册。";
    feedback.className = "feedback bad";
    return;
  }
  if (!state.pendingCode || state.pendingCode.email !== email || state.pendingCode.code !== code || Date.now() > state.pendingCode.expiresAt) {
    feedback.textContent = "验证码不正确或已过期。";
    feedback.className = "feedback bad";
    return;
  }
  account.passwordHash = localPasswordHash(newPassword);
  state.registeredUsers = state.registeredUsers.map((u) => (u.id === account.id ? account : u));
  state.pendingCode = null;
  saveState();
  feedback.textContent = "密码已重置，请使用新密码登录。";
  feedback.className = "feedback good";
  setTimeout(showAuthForm, 2000);
}

async function submitAuth(event) {
  event.preventDefault();
  const username = $("#authUsernameInput").value.trim();
  const password = $("#authPasswordInput").value.trim();
  const feedback = $("#authFeedback");

  if (USE_SUPABASE) {
    const inputEmail = $("#authEmailInput")?.value?.trim() || "";
    if (!inputEmail || !isValidEmail(inputEmail)) {
      feedback.textContent = "请输入有效的邮箱地址。";
      feedback.className = "feedback bad";
      return;
    }
    const email = inputEmail;

    if (state.authMode === "login") {
      if (!email || password.length < 6) {
        feedback.textContent = "请输入邮箱和至少 6 位密码。";
        feedback.className = "feedback bad";
        return;
      }
      feedback.textContent = "正在登录...";
      feedback.className = "feedback";
      try {
        const { user } = await supabaseLogin(email, password);
        await onSupabaseLogin(user);
        feedback.textContent = "登录成功。";
        feedback.className = "feedback good";
        setView("dashboard");
      } catch (err) {
        feedback.textContent = `登录失败：${err.message}`;
        feedback.className = "feedback bad";
      }
      return;
    }

    if (username.length < 2 || !email || password.length < 6) {
      feedback.textContent = "请填写邮箱、用户名和至少 6 位密码。";
      feedback.className = "feedback bad";
      return;
    }
    feedback.textContent = "正在注册...";
    feedback.className = "feedback";
    try {
      const { user } = await supabaseRegister(email, password, username);
      if (user?.identities?.length === 0) {
        feedback.textContent = "该邮箱已注册，请直接登录。";
        feedback.className = "feedback bad";
        return;
      }
      await onSupabaseLogin(user);
      feedback.textContent = "注册成功，已登录。";
      feedback.className = "feedback good";
      setView("dashboard");
    } catch (err) {
      feedback.textContent = `注册失败：${err.message}`;
      feedback.className = "feedback bad";
    }
    return;
  }

  if (USE_NETLIFY_BACKEND) {
    const inputEmail = $("#authEmailInput")?.value?.trim() || "";
    const email = inputEmail || (username.includes("@") ? username : "");
    if (state.authMode === "register" && (username.length < 2 || !isValidEmail(email) || password.length < 6)) {
      feedback.textContent = "请填写邮箱、用户名和至少 6 位密码。";
      feedback.className = "feedback bad";
      return;
    }
    if (state.authMode === "login" && (username.length < 2 || password.length < 6)) {
      feedback.textContent = "请输入已注册的用户名或邮箱，以及至少 6 位密码。";
      feedback.className = "feedback bad";
      return;
    }
    feedback.textContent = state.authMode === "register" ? "正在注册..." : "正在登录...";
    feedback.className = "feedback";
    try {
      const payload = await backendAuth(state.authMode === "register" ? "register" : "login", {
        username,
        email,
        password,
      });
      state.authToken = payload.token;
      state.authUser = normalizeAuthUser(payload.user);
      saveState({ touch: false, remote: false });
      renderUser();
      await initializeRemoteState();
      feedback.textContent = state.authMode === "register" ? "注册成功，已登录。" : "登录成功。";
      feedback.className = "feedback good";
      setView("dashboard");
    } catch (err) {
      feedback.textContent = err.message || "账号服务暂时不可用。";
      feedback.className = "feedback bad";
      if (/先注册|not found|不正确/.test(feedback.textContent)) {
        setAuthMode("register");
      }
    }
    return;
  }

  const email = $("#authEmailInput").value.trim();
  const code = $("#authCodeInput").value.trim();
  if (state.authMode === "login") {
    const account = findRegisteredUser(username);
    if (!account) {
      feedback.textContent = "请先注册账号，再使用登录。";
      feedback.className = "feedback bad";
      setAuthMode("register");
      return;
    }
    if (password.length < 6 || account.passwordHash !== localPasswordHash(password)) {
      feedback.textContent = "账号或密码不正确。";
      feedback.className = "feedback bad";
      return;
    }
    state.authUser = normalizeAuthUser({
      id: account.id,
      name: account.username,
      username: account.username,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt,
    });
    saveState();
    renderUser();
    feedback.textContent = "登录成功。";
    feedback.className = "feedback good";
    setView("dashboard");
    return;
  }
  if (username.length < 2 || !isValidEmail(email) || password.length < 6) {
    feedback.textContent = "请填写邮箱、用户名和至少 6 位密码。";
    feedback.className = "feedback bad";
    return;
  }
  if (!state.pendingCode || state.pendingCode.username !== username || state.pendingCode.email !== email || state.pendingCode.code !== code || Date.now() > state.pendingCode.expiresAt) {
    feedback.textContent = "验证码不正确或已过期。";
    feedback.className = "feedback bad";
    return;
  }
  if (findRegisteredUser(username) || findRegisteredUser(email)) {
    feedback.textContent = "该用户名或邮箱已注册，请直接登录。";
    feedback.className = "feedback bad";
    setAuthMode("login");
    return;
  }
  const localAccount = {
    id: `local-${Date.now()}`,
    username,
    email,
    passwordHash: localPasswordHash(password),
    role: username.toLowerCase().includes("admin") ? "admin" : "learner",
    createdAt: new Date().toISOString(),
  };
  state.registeredUsers = [localAccount, ...(state.registeredUsers || [])];
  state.authUser = normalizeAuthUser({
    id: localAccount.id,
    name: localAccount.username,
    username: localAccount.username,
    email: localAccount.email,
    role: localAccount.role,
    createdAt: localAccount.createdAt,
  });
  state.pendingCode = null;
  saveState();
  renderUser();
  feedback.textContent = "注册成功，已登录。";
  feedback.className = "feedback good";
  setView("dashboard");
}

async function onSupabaseLogin(supabaseUser) {
  const profile = await getProfile(supabaseUser.id);
  const userRole = profile?.role || "learner";
  state.authUser = normalizeAuthUser({
    id: supabaseUser.id,
    username: profile?.username || supabaseUser.email || "",
    name: profile?.nickname || profile?.username || supabaseUser.email || "",
    email: supabaseUser.email || "",
    role: userRole,
  });
  saveState({ touch: false, remote: false });
  renderUser();
  try {
    await loadUserDataFromSupabase(supabaseUser.id);
  } catch (e) {
    console.warn("加载云端数据失败:", e.message);
  }
}

async function loadUserDataFromSupabase(userId) {
  const [progressRows, favorites, checkins, stats] = await Promise.all([
    loadUserProgress(userId),
    loadUserFavorites(userId),
    loadUserCheckins(userId),
    loadUserStats(userId),
  ]);

  const wordProgress = {};
  for (const row of progressRows) {
    wordProgress[normalizeWord(row.word)] = {
      word: row.word,
      correct: row.correct || 0,
      wrong: row.wrong || 0,
      mastery: row.mastery || 0,
      lastStudiedAt: row.last_studied_at || null,
      nextReviewAt: row.next_review_at || null,
    };
  }

  state.wordProgress = { ...state.wordProgress, ...wordProgress };
  state.favoriteWords = [...new Set([...(state.favoriteWords || []), ...favorites])];
  state.checkInDates = [...new Set([...(state.checkInDates || []), ...checkins])];
  if (stats) {
    state.minutes = stats.total_minutes || state.minutes;
    state.wordsLearned = stats.words_learned || state.wordsLearned;
    state.quizScore = stats.quiz_score || state.quizScore;
    state.streak = stats.streak || state.streak;
  }
  saveState({ touch: false, remote: false });
  renderAll();
}

async function syncProgressToSupabase() {
  if (!USE_SUPABASE || !isAuthenticated()) return;
  const userId = state.authUser.id;
  try {
    const progress = state.wordProgress || {};
    for (const [, p] of Object.entries(progress)) {
      if (p && p.word) {
        await saveUserProgress(userId, p.word, p).catch(() => {});
      }
    }

    const remoteFavorites = await loadUserFavorites(userId).catch(() => []);
    const toAdd = (state.favoriteWords || []).filter((w) => !remoteFavorites.includes(w));
    for (const word of toAdd) {
      await addUserFavorite(userId, word).catch(() => {});
    }

    const remoteCheckins = await loadUserCheckins(userId).catch(() => []);
    const toCheckin = (state.checkInDates || []).filter((d) => !remoteCheckins.includes(d));
    for (const date of toCheckin) {
      await addUserCheckin(userId, date).catch(() => {});
    }

    const stats = calculateLearningStats(allWords(), state.wordProgress || {}, state.answers || []);
    await saveUserStats(userId, {
      total_minutes: state.minutes,
      words_learned: stats.studiedWords,
      quiz_score: state.quizScore,
      streak: state.streak,
    }).catch(() => {});
  } catch (e) {
    console.warn("同步到 Supabase 失败:", e.message);
  }
}

function renderUser() {
  const user = normalizeAuthUser(state.authUser);
  state.authUser = user;
  const nickname = getUserNickname(user);
  const account = user
    ? `${user.username || user.name}${user.email ? ` · ${user.email}` : user.phone ? ` · 手机号：${user.phone}` : " · 本地账号"}`
    : "登录后同步学习资料";
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
  $("#adminNavButton")?.toggleAttribute("hidden", !isAdminUser());
  $("#profileAdminButton")?.toggleAttribute("hidden", !isAdminUser());
  $$("[data-view='admin']").forEach((button) => {
    button.disabled = Boolean(user) && !isAdminUser();
    button.title = Boolean(user) && !isAdminUser() ? "仅管理员可进入后台" : "";
  });
}

async function logout() {
  if (USE_SUPABASE) {
    try { await supabaseLogout(); } catch (e) { /* 网络不可用时忽略 */ }
  }
  state.authUser = null;
  state.authToken = null;
  saveState({ remote: false });
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

async function fetchAdminUsers() {
  if (!state.authToken) {
    throw new Error("Missing admin token");
  }
  const response = await fetch("/api/admin/users", {
    headers: {
      Authorization: `${state.authToken ? `Bearer ${state.authToken}` : ""}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Admin request failed");
  }
  return Array.isArray(payload.users) ? payload.users : [];
}

function formatAdminDate(value) {
  if (!value) {
    return "暂无";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "暂无" : date.toLocaleString("zh-CN");
}

function renderAdminUsers() {
  setTextIfPresent("#adminUsersMetric", String(adminUsers.length));
  const list = $("#adminUserList");
  if (!list) {
    return;
  }
  if (!isAdminUser()) {
    list.innerHTML = `<article class="admin-user-card"><span>请使用管理员账号查看用户数据。</span></article>`;
    return;
  }
  if (!USE_NETLIFY_BACKEND && !USE_SUPABASE) {
    renderAdminUserList();
    return;
  }
  if (!USE_NETLIFY_BACKEND) {
    list.innerHTML = `<article class="admin-user-card"><span>公网部署后可查看后端用户数据。</span></article>`;
    return;
  }
  if (adminUsersLoading) {
    list.innerHTML = `<article class="admin-user-card"><span>正在读取用户数据...</span></article>`;
    return;
  }
  if (!adminUsers.length) {
    list.innerHTML = `<article class="admin-user-card"><span>暂无用户数据，点击刷新试试。</span></article>`;
    return;
  }
  list.innerHTML = adminUsers
    .map((user) => {
      const roleLabel = user.role === "admin" ? "管理员" : "学习者";
      const stateLabel = user.hasState ? "有学习记录" : "未同步学习记录";
      return `
        <article class="admin-user-card">
          <header>
            <strong>${escapeHtml(user.username || "未命名")}</strong>
            <small>${escapeHtml(roleLabel)}</small>
          </header>
          <span>${escapeHtml(user.email || "无邮箱")}</span>
          <div class="admin-user-stats">
            <span>${Number(user.minutes || 0)} 分钟</span>
            <span>${Number(user.wordsLearned || 0)} 词</span>
            <span>${Number(user.streak || 0)} 天</span>
            <span>${escapeHtml(stateLabel)}</span>
          </div>
          <small>注册：${escapeHtml(formatAdminDate(user.createdAt))} · 更新：${escapeHtml(formatAdminDate(user.updatedAt))}</small>
          <div class="admin-user-actions">
            <button class="secondary-button compact-button danger-action" data-delete-user="${escapeHtml(user.id || user.username || "")}" type="button">删除用户</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function deleteAdminUser(userId) {
  if (!isAdminUser()) return;

  if (USE_NETLIFY_BACKEND) {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${state.authToken || ""}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "删除失败");
      }
      adminUsers = adminUsers.filter((u) => (u.id || u.username) !== userId);
      renderAdminUsers();
    } catch (err) {
      const fb = $("#adminUsersFeedback");
      if (fb) {
        fb.textContent = err.message;
        fb.className = "feedback bad";
      }
    }
    return;
  }

  if (USE_SUPABASE && isAdminUser()) {
    const fb = $("#adminUsersFeedback");
    if (fb) {
      fb.textContent = "Supabase 模式下请在 Supabase Dashboard 中管理用户。";
      fb.className = "feedback";
    }
    return;
  }

  state.registeredUsers = (state.registeredUsers || []).filter((u) => (u.id || u.username) !== userId);
  saveState();
  renderAdminUserList();
  const fb = $("#adminUsersFeedback");
  if (fb) {
    fb.textContent = "已删除本地用户。";
    fb.className = "feedback good";
  }
}

function renderAdminUserList() {
  const list = $("#adminUserList");
  if (!list) return;
  if (!isAdminUser()) {
    list.innerHTML = `<article class="admin-user-card"><span>请使用管理员账号查看用户数据。</span></article>`;
    return;
  }
  setTextIfPresent("#adminUsersMetric", String((state.registeredUsers || []).length));
  if (!(state.registeredUsers || []).length) {
    list.innerHTML = `<article class="admin-user-card"><span>暂无注册用户。</span></article>`;
    return;
  }
  list.innerHTML = (state.registeredUsers || [])
    .map((user) => {
      const roleLabel = user.role === "admin" ? "管理员" : "学习者";
      const userId = user.id || user.username || "";
      return `
        <article class="admin-user-card">
          <header>
            <strong>${escapeHtml(user.username || "未命名")}</strong>
            <small>${escapeHtml(roleLabel)}</small>
          </header>
          <span>${escapeHtml(user.email || "无邮箱")}</span>
          <small>注册：${escapeHtml(formatAdminDate(user.createdAt))}</small>
          <div class="admin-user-actions">
            <button class="secondary-button compact-button danger-action" data-delete-user="${escapeHtml(userId)}" type="button">删除用户</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAdminUsers() {
  const feedback = $("#adminUsersFeedback");
  if (!isAdminUser()) {
    if (feedback) {
      feedback.textContent = "只有管理员可以查看用户数据。";
      feedback.className = "feedback bad";
    }
    renderAdminUsers();
    return;
  }
  if (!USE_NETLIFY_BACKEND) {
    if (feedback) {
      feedback.textContent = "本地预览不连接生产用户库，请用公网链接查看。";
      feedback.className = "feedback";
    }
    renderAdminUsers();
    return;
  }
  if (adminUsersLoading) {
    return;
  }
  adminUsersLoading = true;
  if (feedback) {
    feedback.textContent = "正在刷新用户数据...";
    feedback.className = "feedback";
  }
  renderAdminUsers();
  try {
    adminUsers = await fetchAdminUsers();
    if (feedback) {
      feedback.textContent = `已加载 ${adminUsers.length} 个用户。`;
      feedback.className = "feedback good";
    }
  } catch (error) {
    if (feedback) {
      feedback.textContent = error.message === "Forbidden" ? "当前账号没有管理员权限。" : "用户数据读取失败，请稍后再试。";
      feedback.className = "feedback bad";
    }
  } finally {
    adminUsersLoading = false;
    renderAdminUsers();
  }
}

function renderAdmin() {
  const pack = activePack();
  const wordList = allWords();
  const wordCount = wordList.length;
  $("#adminLanguageMetric").textContent = pack.label;
  $("#adminWordsMetric").textContent = wordCount;
  $("#adminRoleLabel").textContent = isAdminUser() ? "管理员" : "无权限";
  $("#adminAccessHint").textContent = isAdminUser()
    ? "可以维护当前语言的课程词条，新增内容会进入本地状态并参与同步。"
    : "当前账号不是管理员。测试环境中，用户名包含 admin 的账号会获得管理员角色。";
  $$("#adminWordForm input, #adminWordForm textarea, #adminWordForm button").forEach((control) => {
    control.disabled = !isAdminUser();
  });
  $("#refreshAdminUsersButton")?.toggleAttribute("disabled", !isAdminUser() || adminUsersLoading);
  if ($("#adminWordList")) {
    $("#adminWordList").innerHTML = wordList.length
      ? wordList.slice(0, 36).map((item) => `
          <article class="admin-word-card">
            <strong>${escapeHtml(item.word)}</strong>
            <span>${escapeHtml(item.meaning)}</span>
            <small>${escapeHtml(getLevelLabel(item.level))} · ${escapeHtml(item.category || item.source || "core")}</small>
          </article>
        `).join("")
      : illustratedEmptyState("当前词库暂无词条。", "empty-notebook.svg", "笔记本线稿插画");
  }
  renderAdminUsers();
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

    const reviewButton = event.target.closest("[data-review-word]");
    if (reviewButton) {
      startMistakeReview(reviewButton.dataset.reviewWord);
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      if (state.reviewMode && viewButton.closest("#practice") && viewButton.dataset.view === "dashboard") {
        setView("mistakes");
        return;
      }
      if (viewButton.dataset.view === "practice") {
        state.reviewMode = false;
        state.reviewTargetWord = null;
      }
      if (viewButton.dataset.view === "library") {
        state.libraryMode = "catalog";
        state.libraryPage = 0;
        saveState({ remote: false });
        renderLibrary();
      }
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
      state.libraryMode = "words";
      state.dailyPath = createDailyPath();
      saveState();
      ensureRemoteBookWords(wordBookButton.dataset.wordBook).catch(() => {});
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
      return;
    }

    const masterMistakeButton = event.target.closest("[data-master-mistake]");
    if (masterMistakeButton) {
      const key = normalizeWord(masterMistakeButton.dataset.masterMistake);
      if (state.wordProgress?.[key]) {
        state.wordProgress[key] = {
          ...state.wordProgress[key],
          mastered: true,
          mastery: 4,
          reviewLevel: "mastered",
        };
        saveState();
        renderMistakes();
        renderDesktopDashboard();
      }
    }

    const deleteUserButton = event.target.closest("[data-delete-user]");
    if (deleteUserButton) {
      const userId = deleteUserButton.dataset.deleteUser;
      openConfirmDialog({
        title: "删除用户",
        message: "确认删除该用户吗？此操作不可撤销，用户的所有学习数据将一并删除。",
        action: () => deleteAdminUser(userId),
      });
      return;
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
  on("#spellingPracticeForm", "submit", submitSpellingAnswer);
  on("#playPracticeAudioButton", "click", () => {
    const word = $("#practiceChoiceList").dataset.word;
    if (word) {
      speak(word);
    }
  });
  on("#practiceWord", "click", speakCurrentPracticeWord);
  on("#practiceWord", "keydown", (event) => speakOnKeyboard(event, speakCurrentPracticeWord));
  on("#cancelDialogButton", "click", closeConfirmDialog);
  on("#confirmDialogButton", "click", confirmDialogAction);
  on("#prevCardButton", "click", () => changeCard(-1));
  on("#nextCardButton", "click", () => changeCard(1));
  on("#unknownCardButton", "click", () => markWordWithConfidence("unknown"));
  on("#fuzzyCardButton", "click", () => markWordWithConfidence("fuzzy"));
  on("#knowCardButton", "click", markKnown);
  on("#continueDailyPathButton", "click", continueDailyPath);
  on("#cardWord", "click", speakCurrentCardWord);
  on("#cardWord", "keydown", (event) => speakOnKeyboard(event, speakCurrentCardWord));
  on("#speakCardButton", "click", speakCurrentCardWord);
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
  on("#backToWordBookCatalogButton", "click", () => {
    state.libraryMode = "catalog";
    state.libraryPage = 0;
    saveState({ remote: false });
    renderLibrary();
  });
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
  on("#refreshAdminUsersButton", "click", loadAdminUsers);
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
  on("#forgotPasswordLink", "click", showResetPassword);
  on("#backToLoginLink", "click", showAuthForm);
  on("#sendResetCodeButton", "click", sendResetCode);
  on("#resetPasswordForm", "submit", submitResetPassword);
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

if (USE_SUPABASE) {
  loadRemoteWordBooks()
    .then(() => ensureRemoteBookWords())
    .then(renderAll)
    .catch(() => {});
  getCurrentUser().then((user) => {
    if (user) {
      onSupabaseLogin(user).catch(() => {});
    } else if (state.authUser && !state.authUser.id) {
      state.authUser = null;
      saveState({ remote: false });
      setView("auth");
    }
  }).catch(() => {
    if (!isAuthenticated()) setView("auth");
  });
} else {
  if (USE_NETLIFY_BACKEND) {
    if (state.authToken && state.authUser) {
      initializeRemoteState();
    }
  } else {
    initializeRemoteState();
  }
}
