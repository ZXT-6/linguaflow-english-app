-- LinguaFlow Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- 或使用 supabase migration: supabase db push

-- ============================================================
-- 1. 词汇表 - 所有英语单词
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary (
  id            BIGSERIAL PRIMARY KEY,
  word          TEXT NOT NULL,
  phonetic      TEXT DEFAULT '',
  meaning       TEXT NOT NULL,
  example       TEXT DEFAULT '',
  level         TEXT DEFAULT 'A1',       -- A1/A2/B1/B2
  language      TEXT DEFAULT 'en',
  source        TEXT DEFAULT 'kylebing', -- kylebing/custom
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary (word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_level ON vocabulary (level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_language ON vocabulary (language);

-- ============================================================
-- 2. 词书表
-- ============================================================
CREATE TABLE IF NOT EXISTS word_books (
  id          TEXT PRIMARY KEY,  -- general, middle-school, gaokao, cet4, cet6, postgrad, toefl, sat
  title       TEXT NOT NULL,
  tag         TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order  INT DEFAULT 0
);

INSERT INTO word_books (id, title, tag, description, sort_order) VALUES
  ('general',       '普通学习',  '基础',   '系统基础词 + 自定义词库',       0),
  ('middle-school', '中考词汇',  '中考',   '覆盖初中阶段常见核心词',         1),
  ('gaokao',        '高考词汇',  '高考',   '面向高中阅读、写作核心词',       2),
  ('cet4',          '四级词汇',  'CET-4',  '四级基础阅读、听力和写作高频词', 3),
  ('cet6',          '六级词汇',  'CET-6',  '六级偏抽象表达和学术阅读词',    4),
  ('postgrad',      '考研词汇',  '考研',   '考研英语核心高频词',            5),
  ('toefl',         '托福词汇',  'TOEFL',  '托福考试核心词汇',              6),
  ('sat',           'SAT词汇',   'SAT',    'SAT考试核心词汇',               7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. 词书-单词关联表 (多对多)
-- ============================================================
CREATE TABLE IF NOT EXISTS book_words (
  book_id TEXT NOT NULL REFERENCES word_books(id) ON DELETE CASCADE,
  word    TEXT NOT NULL,
  PRIMARY KEY (book_id, word)
);

CREATE INDEX IF NOT EXISTS idx_book_words_book ON book_words (book_id);
CREATE INDEX IF NOT EXISTS idx_book_words_word ON book_words (word);

-- ============================================================
-- 4. 用户档案表 (基于 Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  nickname      TEXT DEFAULT '',
  avatar_url    TEXT DEFAULT '',
  role          TEXT DEFAULT 'learner',  -- learner / admin
  daily_goal    INT DEFAULT 30,
  target_lang   TEXT DEFAULT 'en',
  auto_speak    BOOLEAN DEFAULT FALSE,
  reminder      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'nickname', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. 用户学习进度表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word            TEXT NOT NULL,
  correct         INT DEFAULT 0,
  wrong           INT DEFAULT 0,
  mastery         INT DEFAULT 0,        -- 0-5 掌握等级
  last_studied_at TIMESTAMPTZ,
  next_review_at  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_review ON user_progress (user_id, next_review_at);

-- ============================================================
-- 6. 用户收藏单词表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, word)
);

-- ============================================================
-- 7. 用户打卡记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_checkins (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, checkin_date)
);

-- ============================================================
-- 8. 用户学习统计表 (汇总缓存)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_minutes    INT DEFAULT 0,
  words_learned    INT DEFAULT 0,
  quiz_score       INT DEFAULT 0,
  streak           INT DEFAULT 1,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) 策略
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的数据
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own checkins" ON user_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON user_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 词汇和词书表所有人可读 (公开数据)
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vocabulary" ON vocabulary
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read word_books" ON word_books
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read book_words" ON book_words
  FOR SELECT USING (true);
