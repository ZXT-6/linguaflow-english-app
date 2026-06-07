import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const BOOK_META = [
  { file: "1-初中-顺序.json", id: "middle-school", title: "中考词汇", tag: "中考", level: "A1" },
  { file: "2-高中-顺序.json", id: "gaokao", title: "高考词汇", tag: "高考", level: "A2" },
  { file: "3-四级-顺序.json", id: "cet4", title: "四级词汇", tag: "CET-4", level: "B1" },
  { file: "4-六级-顺序.json", id: "cet6", title: "六级词汇", tag: "CET-6", level: "B1" },
  { file: "5-考研-顺序.json", id: "postgrad", title: "考研词汇", tag: "考研", level: "B2" },
  { file: "6-托福-顺序.json", id: "toefl", title: "托福词汇", tag: "TOEFL", level: "B2" },
  { file: "7-SAT-顺序.json", id: "sat", title: "SAT词汇", tag: "SAT", level: "B2" },
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false, timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchJSON(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error for ${url}: ${e.message}`));
          }
        });
      })
      .on("error", reject)
      .on("timeout", function () {
        this.destroy();
        reject(new Error(`Timeout for ${url}`));
      });
  });
}

function convertSimpleJSON(entry) {
  const translations = entry.translations || [];
  const meaning = translations.length > 0
    ? translations.map((t) => t.translation).join("；")
    : "";
  const phrases = entry.phrases || [];
  const example = phrases.length > 0 ? phrases[0].phrase : "";
  return {
    word: (entry.word || "").trim(),
    phonetic: entry.phonetic || "",
    meaning,
    example,
  };
}

function convertFullJSON(entry) {
  const headWord = entry.headWord || "";
  const content = entry.content?.word?.content || {};
  const trans = content.trans || [];
  const meaning = trans.length > 0
    ? trans.map((t) => t.tranCn || "").filter(Boolean).join("；")
    : headWord;
  const phonetic = content.usphone || content.ukphone || "";
  const sentences = content.sentence?.sentences || [];
  const example = sentences.length > 0 ? sentences[0].sContent || "" : "";
  return {
    word: headWord.trim(),
    phonetic: typeof phonetic === "string" ? phonetic : "",
    meaning,
    example,
  };
}

function detectFormat(entry) {
  if (entry.headWord !== undefined) return "full";
  if (entry.word !== undefined) return "simple";
  return "unknown";
}

async function importBook(meta) {
  const url = `https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/${encodeURI(meta.file)}`;
  console.log(`  下载: ${meta.file} ...`);
  try {
    const data = await fetchJSON(url);
    if (!Array.isArray(data)) {
      console.warn(`  ⚠ ${meta.file} 不是数组，跳过`);
      return [];
    }
    const words = [];
    for (const entry of data) {
      const format = detectFormat(entry);
      let converted;
      if (format === "full") {
        converted = convertFullJSON(entry);
      } else if (format === "simple") {
        converted = convertSimpleJSON(entry);
      } else {
        continue;
      }
      if (!converted.word || !converted.meaning) continue;
      converted.level = meta.level;
      converted.bookId = meta.id;
      words.push(converted);
    }
    console.log(`  ✓ ${meta.file}: ${words.length} 个词条`);
    return words;
  } catch (err) {
    console.error(`  ✗ ${meta.file}: ${err.message}`);
    return [];
  }
}

function dedupWords(allWords) {
  const seen = new Map();
  const result = [];
  for (const w of allWords) {
    const key = w.word.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(w);
    }
  }
  return result;
}

async function main() {
  console.log("LinguaFlow - KyleBing 词库导入\n");
  console.log(`输出目录: ${DATA_DIR}\n`);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  let allWords = [];
  const bookMap = {};

  for (const meta of BOOK_META) {
    const words = await importBook(meta);
    if (words.length > 0) {
      bookMap[meta.id] = words;
      allWords = allWords.concat(words);
    }
  }

  allWords = dedupWords(allWords);
  console.log(`\n总计: ${allWords.length} 个去重词条`);

  const outputFile = path.join(DATA_DIR, "all-vocabulary.json");
  fs.writeFileSync(outputFile, JSON.stringify(allWords, null, 2), "utf8");
  console.log(`已写入: ${outputFile} (${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(1)} MB)`);

  for (const [bookId, words] of Object.entries(bookMap)) {
    const file = path.join(DATA_DIR, `vocab-${bookId}.json`);
    fs.writeFileSync(file, JSON.stringify(words, null, 2), "utf8");
    console.log(`已写入: ${file} (${words.length} 词条)`);
  }

  const indexMeta = BOOK_META.map((m) => ({
    id: m.id,
    title: m.title,
    tag: m.tag,
    wordCount: (bookMap[m.id] || []).length,
    fileName: `vocab-${m.id}.json`,
  }));
  fs.writeFileSync(path.join(DATA_DIR, "books-index.json"), JSON.stringify(indexMeta, null, 2), "utf8");
  console.log(`已写入: ${path.join(DATA_DIR, "books-index.json")}`);

  console.log("\n导入完成。下一步: npm run db:seed 将数据导入 Supabase。");
}

main().catch((err) => {
  console.error("导入失败:", err.message);
  process.exit(1);
});
