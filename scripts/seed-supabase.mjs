import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("请设置环境变量: SUPABASE_URL 和 SUPABASE_SERVICE_KEY");
  console.error("在 Supabase Dashboard → Settings → API 中获取");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 500;

async function seedVocabulary() {
  const filePath = path.join(DATA_DIR, "all-vocabulary.json");
  if (!fs.existsSync(filePath)) {
    console.error(`未找到词库文件: ${filePath}`);
    console.error("请先运行: node scripts/import-kylebing-vocab.mjs");
    process.exit(1);
  }

  const allWords = JSON.parse(fs.readFileSync(filePath, "utf8"));
  console.log(`读取词库: ${allWords.length} 个词条`);

  const { count: existingCount } = await supabase
    .from("vocabulary")
    .select("*", { count: "exact", head: true });

  if (existingCount > 0) {
    console.log(`数据库已有 ${existingCount} 个词条，将清空后重新导入...`);
    await supabase.from("book_words").delete().neq("book_id", "");
    await supabase.from("vocabulary").delete().neq("word", "");
  }

  console.log("正在导入词汇...");
  let imported = 0;
  for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
    const batch = allWords.slice(i, i + BATCH_SIZE).map((w) => ({
      word: w.word,
      phonetic: w.phonetic || "",
      meaning: w.meaning,
      example: w.example || "",
      level: w.level || "A1",
      language: w.language || "en",
      source: w.source || "kylebing",
    }));

    const { error } = await supabase.from("vocabulary").insert(batch);
    if (error) {
      console.error(`  批量导入失败 (${i}-${i + batch.length}): ${error.message}`);
    } else {
      imported += batch.length;
      process.stdout.write(`\r  已导入: ${imported}/${allWords.length}`);
    }
  }
  console.log(`\n词汇导入完成: ${imported} 个词条`);

  console.log("正在建立词书关联...");
  const booksIndexFile = path.join(DATA_DIR, "books-index.json");
  if (fs.existsSync(booksIndexFile)) {
    const booksIndex = JSON.parse(fs.readFileSync(booksIndexFile, "utf8"));
    for (const bookMeta of booksIndex) {
      const bookFile = path.join(DATA_DIR, `vocab-${bookMeta.id}.json`);
      if (!fs.existsSync(bookFile)) continue;

      const bookWords = JSON.parse(fs.readFileSync(bookFile, "utf8"));
      const bookWordNames = bookWords.map((w) => w.word);

      for (let i = 0; i < bookWordNames.length; i += BATCH_SIZE) {
        const batch = bookWordNames.slice(i, i + BATCH_SIZE).map((word) => ({
          book_id: bookMeta.id,
          word,
        }));
        await supabase.from("book_words").insert(batch).select();
      }
      console.log(`  ${bookMeta.title}: ${bookWordNames.length} 个词条`);
    }
  }

  console.log("\n种子数据导入完成。");
}

seedVocabulary().catch((err) => {
  console.error("种子导入失败:", err.message);
  process.exit(1);
});
