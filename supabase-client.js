const SUPABASE_URL = window.__LINGUAFLOW_SUPABASE_URL__ || "";
const SUPABASE_ANON_KEY = window.__LINGUAFLOW_SUPABASE_ANON_KEY__ || "";
const SUPABASE_CDN = "https://esm.sh/@supabase/supabase-js@2";

let _client = null;
let _loadError = null;

async function loadSupabaseSDK() {
  try {
    return await import(SUPABASE_CDN);
  } catch (e) {
    _loadError = e;
    return null;
  }
}

export async function getSupabase() {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase 未配置。请在 index.html 中设置 __LINGUAFLOW_SUPABASE_URL__ 和 __LINGUAFLOW_SUPABASE_ANON_KEY__。");
    }
    const sdk = await loadSupabaseSDK();
    if (!sdk) {
      throw new Error(_loadError?.message || "Supabase SDK 加载失败");
    }
    _client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

export async function supabaseLogin(email, password) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function supabaseRegister(email, password, username) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username || email.split("@")[0], nickname: username || email.split("@")[0] },
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseLogout() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function updateProfile(userId, updates) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function loadUserProgress(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

export async function saveUserProgress(userId, word, progress) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("user_progress")
    .upsert({
      user_id: userId,
      word,
      correct: progress.correct || 0,
      wrong: progress.wrong || 0,
      mastery: progress.mastery || 0,
      last_studied_at: progress.lastStudiedAt || null,
      next_review_at: progress.nextReviewAt || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, word" });
  if (error) throw error;
}

export async function loadUserFavorites(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("user_favorites")
    .select("word")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r) => r.word);
}

export async function addUserFavorite(userId, word) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("user_favorites")
    .upsert({ user_id: userId, word }, { onConflict: "user_id, word" });
  if (error && error.code !== "23505") throw error;
}

export async function removeUserFavorite(userId, word) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("word", word);
  if (error) throw error;
}

export async function loadUserCheckins(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("user_checkins")
    .select("checkin_date")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r) => r.checkin_date);
}

export async function addUserCheckin(userId, date) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("user_checkins")
    .upsert({ user_id: userId, checkin_date: date }, { onConflict: "user_id, checkin_date" });
  if (error && error.code !== "23505") throw error;
}

export async function loadUserStats(userId) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function saveUserStats(userId, stats) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("user_stats")
    .upsert({
      user_id: userId,
      ...stats,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function searchVocabulary(query, options = {}) {
  const supabase = await getSupabase();
  const { level, bookId, limit = 50, offset = 0 } = options;
  let q = supabase.from("vocabulary").select("*", { count: "exact" });

  if (query) {
    q = q.or(`word.ilike.%${query}%,meaning.ilike.%${query}%`);
  }
  if (level) {
    q = q.eq("level", level);
  }
  if (bookId) {
    q = q.eq("book_id", bookId);
  }
  q = q.range(offset, offset + limit - 1).order("word");
  const { data, count, error } = await q;
  if (error) throw error;
  return { words: data || [], total: count || 0 };
}

export async function getVocabularyByBookId(bookId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("book_words")
    .select("word, vocabulary(*)")
    .eq("book_id", bookId)
    .order("word");
  if (error) throw error;
  return (data || []).map((r) => r.vocabulary).filter(Boolean);
}

export async function getAllBooks() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("word_books")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data || [];
}
