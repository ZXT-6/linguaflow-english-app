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
  { word: "abandon", phonetic: "/abandon/", meaning: "放弃", example: "Do not abandon your goals.", level: "A1" },
  { word: "able", phonetic: "/able/", meaning: "能够", example: "She is able to swim.", level: "A1" },
  { word: "about", phonetic: "/about/", meaning: "关于", example: "What is it about?", level: "A1" },
  { word: "above", phonetic: "/above/", meaning: "在…上面", example: "The picture is above the desk.", level: "A1" },
  { word: "accept", phonetic: "/accept/", meaning: "接受", example: "I accept your apology.", level: "A1" },
  { word: "across", phonetic: "/across/", meaning: "穿过", example: "Walk across the street.", level: "A1" },
  { word: "act", phonetic: "/act/", meaning: "行动", example: "Act quickly.", level: "A1" },
  { word: "add", phonetic: "/add/", meaning: "添加", example: "Add some sugar.", level: "A1" },
  { word: "admit", phonetic: "/admit/", meaning: "承认", example: "He admitted his mistake.", level: "A1" },
  { word: "adult", phonetic: "/adult/", meaning: "成年人", example: "Adults need rest.", level: "A1" },
  { word: "advise", phonetic: "/advise/", meaning: "建议", example: "I advise you to rest.", level: "A1" },
  { word: "afraid", phonetic: "/afraid/", meaning: "害怕", example: "She is afraid of dogs.", level: "A1" },
  { word: "after", phonetic: "/after/", meaning: "在…之后", example: "After school, we play.", level: "A1" },
  { word: "afternoon", phonetic: "/afternoon/", meaning: "下午", example: "Good afternoon.", level: "A1" },
  { word: "again", phonetic: "/again/", meaning: "再次", example: "Try again.", level: "A1" },
  { word: "age", phonetic: "/age/", meaning: "年龄", example: "What is your age?", level: "A1" },
  { word: "agree", phonetic: "/agree/", meaning: "同意", example: "I agree with you.", level: "A1" },
  { word: "ahead", phonetic: "/ahead/", meaning: "在前面", example: "Look ahead.", level: "A1" },
  { word: "air", phonetic: "/air/", meaning: "空气", example: "The air is fresh.", level: "A1" },
  { word: "airport", phonetic: "/airport/", meaning: "机场", example: "Go to the airport.", level: "A1" },
  { word: "allow", phonetic: "/allow/", meaning: "允许", example: "I allow it.", level: "A1" },
  { word: "almost", phonetic: "/almost/", meaning: "几乎", example: "I am almost done.", level: "A1" },
  { word: "alone", phonetic: "/alone/", meaning: "独自", example: "She lives alone.", level: "A1" },
  { word: "along", phonetic: "/along/", meaning: "沿着", example: "Walk along the road.", level: "A1" },
  { word: "already", phonetic: "/already/", meaning: "已经", example: "I already know.", level: "A1" },
  { word: "also", phonetic: "/also/", meaning: "也", example: "I also like it.", level: "A1" },
  { word: "always", phonetic: "/always/", meaning: "总是", example: "Always be kind.", level: "A1" },
  { word: "amazing", phonetic: "/amazing/", meaning: "惊人的", example: "The view is amazing.", level: "A1" },
  { word: "among", phonetic: "/among/", meaning: "在…之中", example: "Among friends.", level: "A1" },
  { word: "ancient", phonetic: "/ancient/", meaning: "古代的", example: "An ancient building.", level: "A1" },
  { word: "angry", phonetic: "/angry/", meaning: "生气的", example: "Do not be angry.", level: "A1" },
  { word: "animal", phonetic: "/animal/", meaning: "动物", example: "I love animals.", level: "A1" },
  { word: "announce", phonetic: "/announce/", meaning: "宣布", example: "They announced the winner.", level: "A1" },
  { word: "another", phonetic: "/another/", meaning: "另一个", example: "Try another way.", level: "A1" },
  { word: "answer", phonetic: "/answer/", meaning: "答案", example: "Give me an answer.", level: "A1" },
  { word: "any", phonetic: "/any/", meaning: "任何", example: "Any questions?", level: "A1" },
  { word: "anyone", phonetic: "/anyone/", meaning: "任何人", example: "Anyone can join.", level: "A1" },
  { word: "anything", phonetic: "/anything/", meaning: "任何事", example: "Anything is possible.", level: "A1" },
  { word: "anywhere", phonetic: "/anywhere/", meaning: "任何地方", example: "Go anywhere you like.", level: "A1" },
  { word: "appear", phonetic: "/appear/", meaning: "出现", example: "Stars appear at night.", level: "A1" },
  { word: "apple", phonetic: "/apple/", meaning: "苹果", example: "I eat an apple.", level: "A1" },
  { word: "area", phonetic: "/area/", meaning: "地区", example: "This area is nice.", level: "A1" },
  { word: "arm", phonetic: "/arm/", meaning: "手臂", example: "Raise your arm.", level: "A1" },
  { word: "around", phonetic: "/around/", meaning: "围绕", example: "Look around.", level: "A1" },
  { word: "arrive", phonetic: "/arrive/", meaning: "到达", example: "We arrived safely.", level: "A1" },
  { word: "art", phonetic: "/art/", meaning: "艺术", example: "I love art.", level: "A1" },
  { word: "ask", phonetic: "/ask/", meaning: "问", example: "Ask me anything.", level: "A1" },
  { word: "attention", phonetic: "/attention/", meaning: "注意力", example: "Pay attention.", level: "A1" },
  { word: "aunt", phonetic: "/aunt/", meaning: "阿姨", example: "My aunt is kind.", level: "A1" },
  { word: "autumn", phonetic: "/autumn/", meaning: "秋天", example: "Leaves fall in autumn.", level: "A1" },
  { word: "available", phonetic: "/available/", meaning: "可用的", example: "Is it available?", level: "A1" },
  { word: "avoid", phonetic: "/avoid/", meaning: "避免", example: "Avoid danger.", level: "A1" },
  { word: "awake", phonetic: "/awake/", meaning: "醒着", example: "I am awake.", level: "A1" },
  { word: "away", phonetic: "/away/", meaning: "离开", example: "Go away.", level: "A1" },
  { word: "baby", phonetic: "/baby/", meaning: "婴儿", example: "The baby sleeps.", level: "A1" },
  { word: "back", phonetic: "/back/", meaning: "回来", example: "Come back soon.", level: "A1" },
  { word: "bad", phonetic: "/bad/", meaning: "坏的", example: "That is bad.", level: "A1" },
  { word: "bag", phonetic: "/bag/", meaning: "包", example: "My bag is heavy.", level: "A1" },
  { word: "ball", phonetic: "/ball/", meaning: "球", example: "Kick the ball.", level: "A1" },
  { word: "banana", phonetic: "/banana/", meaning: "香蕉", example: "I like bananas.", level: "A1" },
  { word: "bank", phonetic: "/bank/", meaning: "银行", example: "Go to the bank.", level: "A1" },
  { word: "base", phonetic: "/base/", meaning: "基础", example: "Start with the base.", level: "A1" },
  { word: "basic", phonetic: "/basic/", meaning: "基本的", example: "Learn the basics.", level: "A1" },
  { word: "basket", phonetic: "/basket/", meaning: "篮子", example: "A basket of fruit.", level: "A1" },
  { word: "bath", phonetic: "/bath/", meaning: "洗澡", example: "Take a bath.", level: "A1" },
  { word: "bathroom", phonetic: "/bathroom/", meaning: "浴室", example: "Where is the bathroom?", level: "A1" },
  { word: "beach", phonetic: "/beach/", meaning: "海滩", example: "We go to the beach.", level: "A1" },
  { word: "bear", phonetic: "/bear/", meaning: "熊", example: "The bear is big.", level: "A1" },
  { word: "beat", phonetic: "/beat/", meaning: "打败", example: "Beat the eggs.", level: "A1" },
  { word: "beautiful", phonetic: "/beautiful/", meaning: "美丽的", example: "She is beautiful.", level: "A1" },
  { word: "because", phonetic: "/because/", meaning: "因为", example: "Because I like it.", level: "A1" },
  { word: "become", phonetic: "/become/", meaning: "成为", example: "Become a better person.", level: "A1" },
  { word: "bed", phonetic: "/bed/", meaning: "床", example: "Go to bed.", level: "A1" },
  { word: "bedroom", phonetic: "/bedroom/", meaning: "卧室", example: "My bedroom is small.", level: "A1" },
  { word: "before", phonetic: "/before/", meaning: "在…之前", example: "Before dinner.", level: "A1" },
  { word: "begin", phonetic: "/begin/", meaning: "开始", example: "Let us begin.", level: "A1" },
  { word: "behind", phonetic: "/behind/", meaning: "在…后面", example: "Behind the door.", level: "A1" },
  { word: "believe", phonetic: "/believe/", meaning: "相信", example: "I believe you.", level: "A1" },
  { word: "bell", phonetic: "/bell/", meaning: "铃", example: "The bell rings.", level: "A1" },
  { word: "below", phonetic: "/below/", meaning: "在…下面", example: "Below the table.", level: "A1" },
  { word: "beside", phonetic: "/beside/", meaning: "在…旁边", example: "Sit beside me.", level: "A1" },
  { word: "best", phonetic: "/best/", meaning: "最好的", example: "You are the best.", level: "A1" },
  { word: "better", phonetic: "/better/", meaning: "更好的", example: "Get better soon.", level: "A1" },
  { word: "between", phonetic: "/between/", meaning: "在…之间", example: "Between us.", level: "A1" },
  { word: "big", phonetic: "/big/", meaning: "大的", example: "A big house.", level: "A1" },
  { word: "bike", phonetic: "/bike/", meaning: "自行车", example: "I ride a bike.", level: "A1" },
  { word: "bird", phonetic: "/bird/", meaning: "鸟", example: "A bird sings.", level: "A1" },
  { word: "birthday", phonetic: "/birthday/", meaning: "生日", example: "Happy birthday!", level: "A1" },
  { word: "black", phonetic: "/black/", meaning: "黑色", example: "Black coffee.", level: "A1" },
  { word: "blind", phonetic: "/blind/", meaning: "盲的", example: "He is blind.", level: "A1" },
  { word: "blood", phonetic: "/blood/", meaning: "血", example: "Red blood.", level: "A1" },
  { word: "blow", phonetic: "/blow/", meaning: "吹", example: "Blow out the candle.", level: "A1" },
  { word: "blue", phonetic: "/blue/", meaning: "蓝色", example: "The sky is blue.", level: "A1" },
  { word: "board", phonetic: "/board/", meaning: "板", example: "Write on the board.", level: "A1" },
  { word: "boat", phonetic: "/boat/", meaning: "船", example: "A small boat.", level: "A1" },
  { word: "body", phonetic: "/body/", meaning: "身体", example: "A healthy body.", level: "A1" },
  { word: "bone", phonetic: "/bone/", meaning: "骨头", example: "A dog bone.", level: "A1" },
  { word: "book", phonetic: "/book/", meaning: "书", example: "Read a book.", level: "A1" },
  { word: "born", phonetic: "/born/", meaning: "出生", example: "I was born here.", level: "A1" },
  { word: "borrow", phonetic: "/borrow/", meaning: "借", example: "Can I borrow it?", level: "A1" },
  { word: "boss", phonetic: "/boss/", meaning: "老板", example: "My boss is kind.", level: "A1" },
  { word: "both", phonetic: "/both/", meaning: "两者", example: "Both are good.", level: "A1" },
  { word: "bottle", phonetic: "/bottle/", meaning: "瓶子", example: "A water bottle.", level: "A1" },
  { word: "bottom", phonetic: "/bottom/", meaning: "底部", example: "At the bottom.", level: "A1" },
  { word: "bowl", phonetic: "/bowl/", meaning: "碗", example: "A bowl of soup.", level: "A1" },
  { word: "box", phonetic: "/box/", meaning: "盒子", example: "A wooden box.", level: "A1" },
  { word: "boy", phonetic: "/boy/", meaning: "男孩", example: "The boy runs.", level: "A1" },
  { word: "brain", phonetic: "/brain/", meaning: "大脑", example: "Use your brain.", level: "A1" },
  { word: "brave", phonetic: "/brave/", meaning: "勇敢的", example: "Be brave.", level: "A1" },
  { word: "bread", phonetic: "/bread/", meaning: "面包", example: "Fresh bread.", level: "A1" },
  { word: "break", phonetic: "/break/", meaning: "打破", example: "Do not break it.", level: "A1" },
  { word: "breakfast", phonetic: "/breakfast/", meaning: "早餐", example: "Eat breakfast.", level: "A1" },
  { word: "bright", phonetic: "/bright/", meaning: "明亮的", example: "A bright day.", level: "A1" },
  { word: "bring", phonetic: "/bring/", meaning: "带来", example: "Bring me water.", level: "A1" },
  { word: "brother", phonetic: "/brother/", meaning: "兄弟", example: "My brother is tall.", level: "A1" },
  { word: "brown", phonetic: "/brown/", meaning: "棕色", example: "Brown shoes.", level: "A1" },
  { word: "brush", phonetic: "/brush/", meaning: "刷", example: "Brush your teeth.", level: "A1" },
  { word: "build", phonetic: "/build/", meaning: "建造", example: "Build a house.", level: "A1" },
  { word: "building", phonetic: "/building/", meaning: "建筑物", example: "A tall building.", level: "A1" },
  { word: "burn", phonetic: "/burn/", meaning: "燃烧", example: "The fire burns.", level: "A1" },
  { word: "bus", phonetic: "/bus/", meaning: "公交车", example: "Take the bus.", level: "A1" },
  { word: "business", phonetic: "/business/", meaning: "生意", example: "My own business.", level: "A1" },
  { word: "busy", phonetic: "/busy/", meaning: "忙碌的", example: "I am busy.", level: "A1" },
  { word: "butter", phonetic: "/butter/", meaning: "黄油", example: "Bread and butter.", level: "A1" },
  { word: "button", phonetic: "/button/", meaning: "按钮", example: "Press the button.", level: "A1" },
  { word: "buy", phonetic: "/buy/", meaning: "买", example: "I want to buy it.", level: "A1" },
  { word: "cake", phonetic: "/cake/", meaning: "蛋糕", example: "A chocolate cake.", level: "A1" },
  { word: "call", phonetic: "/call/", meaning: "打电话", example: "Call me later.", level: "A1" },
  { word: "calm", phonetic: "/calm/", meaning: "平静的", example: "Stay calm.", level: "A1" },
  { word: "camera", phonetic: "/camera/", meaning: "相机", example: "Take a photo.", level: "A1" },
  { word: "camp", phonetic: "/camp/", meaning: "露营", example: "Go camping.", level: "A1" },
  { word: "car", phonetic: "/car/", meaning: "汽车", example: "Drive a car.", level: "A1" },
  { word: "card", phonetic: "/card/", meaning: "卡片", example: "A birthday card.", level: "A1" },
  { word: "care", phonetic: "/care/", meaning: "关心", example: "Take care.", level: "A1" },
  { word: "careful", phonetic: "/careful/", meaning: "小心的", example: "Be careful.", level: "A1" },
  { word: "carry", phonetic: "/carry/", meaning: "携带", example: "Carry this bag.", level: "A1" },
  { word: "cat", phonetic: "/cat/", meaning: "猫", example: "The cat sleeps.", level: "A1" },
  { word: "catch", phonetic: "/catch/", meaning: "抓住", example: "Catch the ball.", level: "A1" },
  { word: "cause", phonetic: "/cause/", meaning: "原因", example: "What caused it?", level: "A1" },
  { word: "celebrate", phonetic: "/celebrate/", meaning: "庆祝", example: "Celebrate together.", level: "A1" },
  { word: "center", phonetic: "/center/", meaning: "中心", example: "The city center.", level: "A1" },
  { word: "century", phonetic: "/century/", meaning: "世纪", example: "A century ago.", level: "A1" },
  { word: "certain", phonetic: "/certain/", meaning: "确定的", example: "I am certain.", level: "A1" },
  { word: "chair", phonetic: "/chair/", meaning: "椅子", example: "Sit on the chair.", level: "A1" },
  { word: "chance", phonetic: "/chance/", meaning: "机会", example: "Take a chance.", level: "A1" },
  { word: "change", phonetic: "/change/", meaning: "改变", example: "Change your mind.", level: "A1" },
  { word: "charge", phonetic: "/charge/", meaning: "收费", example: "How much is the charge?", level: "A1" },
  { word: "cheap", phonetic: "/cheap/", meaning: "便宜的", example: "It is cheap.", level: "A1" },
  { word: "check", phonetic: "/check/", meaning: "检查", example: "Check your work.", level: "A1" },
  { word: "cheese", phonetic: "/cheese/", meaning: "奶酪", example: "I like cheese.", level: "A1" },
  { word: "chicken", phonetic: "/chicken/", meaning: "鸡肉", example: "Fried chicken.", level: "A1" },
  { word: "child", phonetic: "/child/", meaning: "孩子", example: "A happy child.", level: "A1" },
  { word: "choice", phonetic: "/choice/", meaning: "选择", example: "Make a choice.", level: "A1" },
  { word: "choose", phonetic: "/choose/", meaning: "选择", example: "Choose one.", level: "A1" },
  { word: "church", phonetic: "/church/", meaning: "教堂", example: "Go to church.", level: "A1" },
  { word: "city", phonetic: "/city/", meaning: "城市", example: "A big city.", level: "A1" },
  { word: "claim", phonetic: "/claim/", meaning: "声称", example: "He claims to know.", level: "A1" },
  { word: "class", phonetic: "/class/", meaning: "班级", example: "In my class.", level: "A1" },
  { word: "clean", phonetic: "/clean/", meaning: "干净的", example: "Keep it clean.", level: "A1" },
  { word: "clear", phonetic: "/clear/", meaning: "清楚的", example: "It is clear.", level: "A1" },
  { word: "clever", phonetic: "/clever/", meaning: "聪明的", example: "A clever child.", level: "A1" },
  { word: "climb", phonetic: "/climb/", meaning: "攀登", example: "Climb the tree.", level: "A1" },
  { word: "clock", phonetic: "/clock/", meaning: "钟", example: "Look at the clock.", level: "A1" },
  { word: "close", phonetic: "/close/", meaning: "关闭", example: "Close the door.", level: "A1" },
  { word: "clothes", phonetic: "/clothes/", meaning: "衣服", example: "Wash your clothes.", level: "A1" },
  { word: "cloud", phonetic: "/cloud/", meaning: "云", example: "A white cloud.", level: "A1" },
  { word: "club", phonetic: "/club/", meaning: "俱乐部", example: "Join the club.", level: "A1" },
  { word: "coach", phonetic: "/coach/", meaning: "教练", example: "The football coach.", level: "A1" },
  { word: "coast", phonetic: "/coast/", meaning: "海岸", example: "The east coast.", level: "A1" },
  { word: "coat", phonetic: "/coat/", meaning: "外套", example: "Wear a coat.", level: "A1" },
  { word: "coffee", phonetic: "/coffee/", meaning: "咖啡", example: "A cup of coffee.", level: "A1" },
  { word: "coin", phonetic: "/coin/", meaning: "硬币", example: "A gold coin.", level: "A1" },
  { word: "cold", phonetic: "/cold/", meaning: "冷的", example: "It is cold.", level: "A1" },
  { word: "collect", phonetic: "/collect/", meaning: "收集", example: "Collect stamps.", level: "A1" },
  { word: "college", phonetic: "/college/", meaning: "大学", example: "Go to college.", level: "A1" },
  { word: "color", phonetic: "/color/", meaning: "颜色", example: "What color?", level: "A1" },
  { word: "come", phonetic: "/come/", meaning: "来", example: "Come here.", level: "A1" },
  { word: "common", phonetic: "/common/", meaning: "常见的", example: "A common word.", level: "A1" },
  { word: "community", phonetic: "/community/", meaning: "社区", example: "Our community.", level: "A1" },
  { word: "company", phonetic: "/company/", meaning: "公司", example: "A big company.", level: "A1" },
  { word: "compare", phonetic: "/compare/", meaning: "比较", example: "Compare prices.", level: "A1" },
  { word: "compete", phonetic: "/compete/", meaning: "竞争", example: "Compete fairly.", level: "A1" },
  { word: "complete", phonetic: "/complete/", meaning: "完成", example: "Complete the task.", level: "A1" },
  { word: "computer", phonetic: "/computer/", meaning: "电脑", example: "Use a computer.", level: "A1" },
  { word: "consider", phonetic: "/consider/", meaning: "考虑", example: "Consider this.", level: "A1" },
  { word: "contain", phonetic: "/contain/", meaning: "包含", example: "It contains milk.", level: "A1" },
  { word: "continue", phonetic: "/continue/", meaning: "继续", example: "Continue walking.", level: "A1" },
  { word: "control", phonetic: "/control/", meaning: "控制", example: "Control yourself.", level: "A1" },
  { word: "cook", phonetic: "/cook/", meaning: "烹饪", example: "I can cook.", level: "A1" },
  { word: "cool", phonetic: "/cool/", meaning: "凉爽", example: "Cool weather.", level: "A1" },
  { word: "copy", phonetic: "/copy/", meaning: "复制", example: "Copy this.", level: "A1" },
  { word: "corner", phonetic: "/corner/", meaning: "角落", example: "In the corner.", level: "A1" },
  { word: "correct", phonetic: "/correct/", meaning: "正确的", example: "That is correct.", level: "A1" },
  { word: "cost", phonetic: "/cost/", meaning: "花费", example: "How much does it cost?", level: "A1" },
  { word: "count", phonetic: "/count/", meaning: "数", example: "Count to ten.", level: "A1" },
  { word: "country", phonetic: "/country/", meaning: "国家", example: "A beautiful country.", level: "A1" },
  { word: "couple", phonetic: "/couple/", meaning: "一对", example: "A couple of days.", level: "A1" },
  { word: "courage", phonetic: "/courage/", meaning: "勇气", example: "Have courage.", level: "A1" },
  { word: "course", phonetic: "/course/", meaning: "课程", example: "An English course.", level: "A1" },
  { word: "cousin", phonetic: "/cousin/", meaning: "表亲", example: "My cousin is smart.", level: "A1" },
  { word: "cover", phonetic: "/cover/", meaning: "覆盖", example: "Cover the table.", level: "A1" },
  { word: "crash", phonetic: "/crash/", meaning: "碰撞", example: "A car crash.", level: "A1" },
  { word: "crazy", phonetic: "/crazy/", meaning: "疯狂的", example: "That is crazy.", level: "A1" },
  { word: "create", phonetic: "/create/", meaning: "创造", example: "Create something.", level: "A1" },
  { word: "cross", phonetic: "/cross/", meaning: "穿过", example: "Cross the road.", level: "A1" },
  { word: "crowd", phonetic: "/crowd/", meaning: "人群", example: "A big crowd.", level: "A1" },
  { word: "cry", phonetic: "/cry/", meaning: "哭", example: "Do not cry.", level: "A1" },
  { word: "culture", phonetic: "/culture/", meaning: "文化", example: "Learn about culture.", level: "A1" },
  { word: "cup", phonetic: "/cup/", meaning: "杯子", example: "A cup of tea.", level: "A1" },
  { word: "current", phonetic: "/current/", meaning: "当前的", example: "The current time.", level: "A1" },
  { word: "customer", phonetic: "/customer/", meaning: "顾客", example: "The customer is happy.", level: "A1" },
  { word: "cut", phonetic: "/cut/", meaning: "切", example: "Cut the cake.", level: "A1" },
  { word: "damage", phonetic: "/damage/", meaning: "损坏", example: "No damage done.", level: "A1" },
  { word: "dance", phonetic: "/dance/", meaning: "跳舞", example: "I love to dance.", level: "A1" },
  { word: "danger", phonetic: "/danger/", meaning: "危险", example: "Be careful of danger.", level: "A1" },
  { word: "dark", phonetic: "/dark/", meaning: "黑暗的", example: "It is dark outside.", level: "A1" },
  { word: "daughter", phonetic: "/daughter/", meaning: "女儿", example: "My daughter is smart.", level: "A1" },
  { word: "dead", phonetic: "/dead/", meaning: "死的", example: "The plant is dead.", level: "A1" },
  { word: "deal", phonetic: "/deal/", meaning: "交易", example: "A good deal.", level: "A1" },
  { word: "dear", phonetic: "/dear/", meaning: "亲爱的", example: "Dear friend.", level: "A1" },
  { word: "death", phonetic: "/death/", meaning: "死亡", example: "A sad death.", level: "A1" },
  { word: "decide", phonetic: "/decide/", meaning: "决定", example: "Decide now.", level: "A1" },
  { word: "deep", phonetic: "/deep/", meaning: "深的", example: "A deep hole.", level: "A1" },
  { word: "degree", phonetic: "/degree/", meaning: "学位", example: "A college degree.", level: "A1" },
  { word: "depend", phonetic: "/depend/", meaning: "取决于", example: "It depends.", level: "A1" },
  { word: "describe", phonetic: "/describe/", meaning: "描述", example: "Describe it.", level: "A1" },
  { word: "design", phonetic: "/design/", meaning: "设计", example: "Design a logo.", level: "A1" },
  { word: "desk", phonetic: "/desk/", meaning: "书桌", example: "Sit at the desk.", level: "A1" },
  { word: "develop", phonetic: "/develop/", meaning: "发展", example: "Develop skills.", level: "A1" },
  { word: "die", phonetic: "/die/", meaning: "死", example: "Flowers die.", level: "A1" },
  { word: "diet", phonetic: "/diet/", meaning: "饮食", example: "A healthy diet.", level: "A1" },
  { word: "difference", phonetic: "/difference/", meaning: "区别", example: "What is the difference?", level: "A1" },
  { word: "different", phonetic: "/different/", meaning: "不同的", example: "Different colors.", level: "A1" },
  { word: "difficult", phonetic: "/difficult/", meaning: "困难的", example: "This is difficult.", level: "A1" },
  { word: "dig", phonetic: "/dig/", meaning: "挖", example: "Dig a hole.", level: "A1" },
  { word: "dinner", phonetic: "/dinner/", meaning: "晚餐", example: "Dinner is ready.", level: "A1" },
  { word: "direct", phonetic: "/direct/", meaning: "直接的", example: "A direct answer.", level: "A1" },
  { word: "direction", phonetic: "/direction/", meaning: "方向", example: "Which direction?", level: "A1" },
  { word: "dirty", phonetic: "/dirty/", meaning: "脏的", example: "Your hands are dirty.", level: "A1" },
  { word: "discover", phonetic: "/discover/", meaning: "发现", example: "Discover new things.", level: "A1" },
  { word: "discuss", phonetic: "/discuss/", meaning: "讨论", example: "Let us discuss.", level: "A1" },
  { word: "disease", phonetic: "/disease/", meaning: "疾病", example: "A common disease.", level: "A1" },
  { word: "dish", phonetic: "/dish/", meaning: "菜", example: "A delicious dish.", level: "A1" },
  { word: "distance", phonetic: "/distance/", meaning: "距离", example: "A long distance.", level: "A1" },
  { word: "divide", phonetic: "/divide/", meaning: "分开", example: "Divide into groups.", level: "A1" },
  { word: "doctor", phonetic: "/doctor/", meaning: "医生", example: "See a doctor.", level: "A1" },
  { word: "document", phonetic: "/document/", meaning: "文件", example: "Sign the document.", level: "A1" },
  { word: "dog", phonetic: "/dog/", meaning: "狗", example: "A loyal dog.", level: "A1" },
  { word: "dollar", phonetic: "/dollar/", meaning: "美元", example: "Ten dollars.", level: "A1" },
  { word: "door", phonetic: "/door/", meaning: "门", example: "Open the door.", level: "A1" },
  { word: "double", phonetic: "/double/", meaning: "双倍", example: "Double check.", level: "A1" },
  { word: "doubt", phonetic: "/doubt/", meaning: "怀疑", example: "No doubt.", level: "A1" },
  { word: "down", phonetic: "/down/", meaning: "向下", example: "Sit down.", level: "A1" },
  { word: "draw", phonetic: "/draw/", meaning: "画", example: "Draw a picture.", level: "A1" },
  { word: "dream", phonetic: "/dream/", meaning: "梦想", example: "A big dream.", level: "A1" },
  { word: "dress", phonetic: "/dress/", meaning: "连衣裙", example: "A red dress.", level: "A1" },
  { word: "drink", phonetic: "/drink/", meaning: "喝", example: "Drink water.", level: "A1" },
  { word: "drive", phonetic: "/drive/", meaning: "驾驶", example: "Drive carefully.", level: "A1" },
  { word: "drop", phonetic: "/drop/", meaning: "掉落", example: "Drop it.", level: "A1" },
  { word: "dry", phonetic: "/dry/", meaning: "干的", example: "Keep it dry.", level: "A1" },
  { word: "during", phonetic: "/during/", meaning: "在…期间", example: "During the night.", level: "A1" },
  { word: "dust", phonetic: "/dust/", meaning: "灰尘", example: "Dust the shelf.", level: "A1" },
  { word: "duty", phonetic: "/duty/", meaning: "责任", example: "Do your duty.", level: "A1" },
  { word: "each", phonetic: "/each/", meaning: "每个", example: "Each person.", level: "A1" },
  { word: "ear", phonetic: "/ear/", meaning: "耳朵", example: "I hear with my ears.", level: "A1" },
  { word: "early", phonetic: "/early/", meaning: "早的", example: "Wake up early.", level: "A1" },
  { word: "earn", phonetic: "/earn/", meaning: "赚", example: "Earn money.", level: "A1" },
  { word: "earth", phonetic: "/earth/", meaning: "地球", example: "The earth is round.", level: "A1" },
  { word: "east", phonetic: "/east/", meaning: "东方", example: "The sun rises in the east.", level: "A1" },
  { word: "easy", phonetic: "/easy/", meaning: "容易的", example: "This is easy.", level: "A1" },
  { word: "eat", phonetic: "/eat/", meaning: "吃", example: "Eat your food.", level: "A1" },
  { word: "edge", phonetic: "/edge/", meaning: "边缘", example: "On the edge.", level: "A1" },
  { word: "education", phonetic: "/education/", meaning: "教育", example: "Education is important.", level: "A1" },
  { word: "effect", phonetic: "/effect/", meaning: "影响", example: "A positive effect.", level: "A1" },
  { word: "effort", phonetic: "/effort/", meaning: "努力", example: "Make an effort.", level: "A1" },
  { word: "egg", phonetic: "/egg/", meaning: "鸡蛋", example: "Boil an egg.", level: "A1" },
  { word: "eight", phonetic: "/eight/", meaning: "八", example: "Eight o'clock.", level: "A1" },
  { word: "either", phonetic: "/either/", meaning: "要么", example: "Either way.", level: "A1" },
  { word: "electric", phonetic: "/electric/", meaning: "电的", example: "An electric car.", level: "A1" },
  { word: "elephant", phonetic: "/elephant/", meaning: "大象", example: "A big elephant.", level: "A1" },
  { word: "else", phonetic: "/else/", meaning: "其他", example: "What else?", level: "A1" },
  { word: "empty", phonetic: "/empty/", meaning: "空的", example: "The room is empty.", level: "A1" },
  { word: "encourage", phonetic: "/encourage/", meaning: "鼓励", example: "Encourage others.", level: "A1" },
  { word: "end", phonetic: "/end/", meaning: "结束", example: "The end.", level: "A1" },
  { word: "enemy", phonetic: "/enemy/", meaning: "敌人", example: "An old enemy.", level: "A1" },
  { word: "energy", phonetic: "/energy/", meaning: "能量", example: "Solar energy.", level: "A1" },
  { word: "engine", phonetic: "/engine/", meaning: "发动机", example: "The engine runs.", level: "A1" },
  { word: "engineer", phonetic: "/engineer/", meaning: "工程师", example: "A software engineer.", level: "A1" },
  { word: "enjoy", phonetic: "/enjoy/", meaning: "享受", example: "Enjoy your meal.", level: "A1" },
  { word: "enough", phonetic: "/enough/", meaning: "足够", example: "That is enough.", level: "A1" },
  { word: "enter", phonetic: "/enter/", meaning: "进入", example: "Enter the room.", level: "A1" },
  { word: "entire", phonetic: "/entire/", meaning: "整个", example: "The entire day.", level: "A1" },
  { word: "entrance", phonetic: "/entrance/", meaning: "入口", example: "The main entrance.", level: "A1" },
  { word: "equal", phonetic: "/equal/", meaning: "平等", example: "All are equal.", level: "A1" },
  { word: "error", phonetic: "/error/", meaning: "错误", example: "An error occurred.", level: "A1" },
  { word: "escape", phonetic: "/escape/", meaning: "逃跑", example: "Escape from danger.", level: "A1" },
  { word: "especially", phonetic: "/especially/", meaning: "尤其", example: "I like it especially.", level: "A1" },
  { word: "evening", phonetic: "/evening/", meaning: "晚上", example: "Good evening.", level: "A1" },
  { word: "event", phonetic: "/event/", meaning: "事件", example: "A big event.", level: "A1" },
  { word: "ever", phonetic: "/ever/", meaning: "曾经", example: "Have you ever?", level: "A1" },
  { word: "every", phonetic: "/every/", meaning: "每个", example: "Every day.", level: "A1" },
  { word: "everyone", phonetic: "/everyone/", meaning: "每个人", example: "Everyone is here.", level: "A1" },
  { word: "everything", phonetic: "/everything/", meaning: "一切", example: "Everything is fine.", level: "A1" },
  { word: "everywhere", phonetic: "/everywhere/", meaning: "到处", example: "I looked everywhere.", level: "A1" },
  { word: "exact", phonetic: "/exact/", meaning: "确切的", example: "The exact time.", level: "A1" },
  { word: "examine", phonetic: "/examine/", meaning: "检查", example: "Examine the evidence.", level: "A1" },
  { word: "example", phonetic: "/example/", meaning: "例子", example: "For example.", level: "A1" },
  { word: "excellent", phonetic: "/excellent/", meaning: "优秀的", example: "Excellent work.", level: "A1" },
  { word: "except", phonetic: "/except/", meaning: "除了", example: "Except me.", level: "A1" },
  { word: "exchange", phonetic: "/exchange/", meaning: "交换", example: "Exchange gifts.", level: "A1" },
  { word: "excited", phonetic: "/excited/", meaning: "兴奋的", example: "I am excited.", level: "A1" },
  { word: "exciting", phonetic: "/exciting/", meaning: "令人兴奋的", example: "How exciting!", level: "A1" },
  { word: "excuse", phonetic: "/excuse/", meaning: "借口", example: "Excuse me.", level: "A1" },
  { word: "exercise", phonetic: "/exercise/", meaning: "锻炼", example: "Do exercise.", level: "A1" },
  { word: "exist", phonetic: "/exist/", meaning: "存在", example: "It does not exist.", level: "A1" },
  { word: "expect", phonetic: "/expect/", meaning: "期望", example: "I expect good news.", level: "A1" },
  { word: "experience", phonetic: "/experience/", meaning: "经验", example: "Work experience.", level: "A1" },
  { word: "experiment", phonetic: "/experiment/", meaning: "实验", example: "A science experiment.", level: "A1" },
  { word: "explain", phonetic: "/explain/", meaning: "解释", example: "Explain it to me.", level: "A1" },
  { word: "express", phonetic: "/express/", meaning: "表达", example: "Express yourself.", level: "A1" },
  { word: "extra", phonetic: "/extra/", meaning: "额外的", example: "Extra time.", level: "A1" },
  { word: "eye", phonetic: "/eye/", meaning: "眼睛", example: "Blue eyes.", level: "A1" },
  { word: "face", phonetic: "/face/", meaning: "脸", example: "A happy face.", level: "A1" },
  { word: "fact", phonetic: "/fact/", meaning: "事实", example: "That is a fact.", level: "A1" },
  { word: "factory", phonetic: "/factory/", meaning: "工厂", example: "A car factory.", level: "A1" },
  { word: "fail", phonetic: "/fail/", meaning: "失败", example: "I failed the test.", level: "A1" },
  { word: "fair", phonetic: "/fair/", meaning: "公平的", example: "A fair deal.", level: "A1" },
  { word: "fall", phonetic: "/fall/", meaning: "落下", example: "Leaves fall.", level: "A1" },
  { word: "family", phonetic: "/family/", meaning: "家庭", example: "My family.", level: "A1" },
  { word: "famous", phonetic: "/famous/", meaning: "著名的", example: "A famous person.", level: "A1" },
  { word: "fan", phonetic: "/fan/", meaning: "粉丝", example: "A big fan.", level: "A1" },
  { word: "far", phonetic: "/far/", meaning: "远的", example: "Not far away.", level: "A1" },
  { word: "farm", phonetic: "/farm/", meaning: "农场", example: "A green farm.", level: "A1" },
  { word: "fast", phonetic: "/fast/", meaning: "快的", example: "Run fast.", level: "A1" },
  { word: "fat", phonetic: "/fat/", meaning: "胖的", example: "A fat cat.", level: "A1" },
  { word: "father", phonetic: "/father/", meaning: "父亲", example: "My father.", level: "A1" },
  { word: "favorite", phonetic: "/favorite/", meaning: "最喜欢的", example: "My favorite.", level: "A1" },
  { word: "fear", phonetic: "/fear/", meaning: "恐惧", example: "Overcome fear.", level: "A1" },
  { word: "feed", phonetic: "/feed/", meaning: "喂", example: "Feed the baby.", level: "A1" },
  { word: "feel", phonetic: "/feel/", meaning: "感觉", example: "I feel good.", level: "A1" },
  { word: "festival", phonetic: "/festival/", meaning: "节日", example: "A music festival.", level: "A1" },
  { word: "few", phonetic: "/few/", meaning: "少数", example: "A few people.", level: "A1" },
  { word: "field", phonetic: "/field/", meaning: "田地", example: "A green field.", level: "A1" },
  { word: "fight", phonetic: "/fight/", meaning: "打架", example: "Do not fight.", level: "A1" },
  { word: "fill", phonetic: "/fill/", meaning: "填满", example: "Fill the glass.", level: "A1" },
  { word: "film", phonetic: "/film/", meaning: "电影", example: "A good film.", level: "A1" },
  { word: "final", phonetic: "/final/", meaning: "最终的", example: "The final answer.", level: "A1" },
  { word: "finally", phonetic: "/finally/", meaning: "最终", example: "Finally done.", level: "A1" },
  { word: "find", phonetic: "/find/", meaning: "找到", example: "Find the key.", level: "A1" },
  { word: "fine", phonetic: "/fine/", meaning: "好的", example: "I am fine.", level: "A1" },
  { word: "finger", phonetic: "/finger/", meaning: "手指", example: "Point with your finger.", level: "A1" },
  { word: "finish", phonetic: "/finish/", meaning: "完成", example: "Finish your work.", level: "A1" },
  { word: "fire", phonetic: "/fire/", meaning: "火", example: "A warm fire.", level: "A1" },
  { word: "first", phonetic: "/first/", meaning: "第一", example: "First of all.", level: "A1" },
  { word: "fish", phonetic: "/fish/", meaning: "鱼", example: "Fish in the sea.", level: "A1" },
  { word: "fit", phonetic: "/fit/", meaning: "适合", example: "It fits well.", level: "A1" },
  { word: "fix", phonetic: "/fix/", meaning: "修理", example: "Fix the car.", level: "A1" },
  { word: "flag", phonetic: "/flag/", meaning: "旗", example: "A red flag.", level: "A1" },
  { word: "flat", phonetic: "/flat/", meaning: "平坦的", example: "A flat surface.", level: "A1" },
  { word: "flight", phonetic: "/flight/", meaning: "航班", example: "A long flight.", level: "A1" },
  { word: "floor", phonetic: "/floor/", meaning: "地板", example: "Clean the floor.", level: "A1" },
  { word: "flower", phonetic: "/flower/", meaning: "花", example: "A beautiful flower.", level: "A1" },
  { word: "fly", phonetic: "/fly/", meaning: "飞", example: "Birds fly.", level: "A1" },
  { word: "follow", phonetic: "/follow/", meaning: "跟随", example: "Follow me.", level: "A1" },
  { word: "food", phonetic: "/food/", meaning: "食物", example: "Good food.", level: "A1" },
  { word: "fool", phonetic: "/fool/", meaning: "傻瓜", example: "Do not be a fool.", level: "A1" },
  { word: "foot", phonetic: "/foot/", meaning: "脚", example: "My foot hurts.", level: "A1" },
  { word: "football", phonetic: "/football/", meaning: "足球", example: "Play football.", level: "A1" },
  { word: "force", phonetic: "/force/", meaning: "力量", example: "Use force.", level: "A1" },
  { word: "foreign", phonetic: "/foreign/", meaning: "外国的", example: "A foreign language.", level: "A1" },
  { word: "forest", phonetic: "/forest/", meaning: "森林", example: "A deep forest.", level: "A1" },
  { word: "forever", phonetic: "/forever/", meaning: "永远", example: "Not forever.", level: "A1" },
  { word: "forget", phonetic: "/forget/", meaning: "忘记", example: "Do not forget.", level: "A1" },
  { word: "form", phonetic: "/form/", meaning: "形式", example: "A new form.", level: "A1" },
  { word: "forward", phonetic: "/forward/", meaning: "向前", example: "Move forward.", level: "A1" },
  { word: "free", phonetic: "/free/", meaning: "自由的", example: "It is free.", level: "A1" },
  { word: "freedom", phonetic: "/freedom/", meaning: "自由", example: "Freedom is precious.", level: "A1" },
  { word: "fresh", phonetic: "/fresh/", meaning: "新鲜的", example: "Fresh air.", level: "A1" },
  { word: "friend", phonetic: "/friend/", meaning: "朋友", example: "A good friend.", level: "A1" },
  { word: "friendly", phonetic: "/friendly/", meaning: "友好的", example: "A friendly person.", level: "A1" },
  { word: "front", phonetic: "/front/", meaning: "前面", example: "In front of.", level: "A1" },
  { word: "fruit", phonetic: "/fruit/", meaning: "水果", example: "Fresh fruit.", level: "A1" },
  { word: "full", phonetic: "/full/", meaning: "满的", example: "A full glass.", level: "A1" },
  { word: "fun", phonetic: "/fun/", meaning: "乐趣", example: "Have fun.", level: "A1" },
  { word: "funny", phonetic: "/funny/", meaning: "有趣的", example: "A funny joke.", level: "A1" },
  { word: "future", phonetic: "/future/", meaning: "未来", example: "Plan for the future.", level: "A1" },
  { word: "gain", phonetic: "/gain/", meaning: "获得", example: "Gain experience.", level: "A1" },
  { word: "game", phonetic: "/game/", meaning: "游戏", example: "Play a game.", level: "A1" },
  { word: "garden", phonetic: "/garden/", meaning: "花园", example: "A beautiful garden.", level: "A1" },
  { word: "gate", phonetic: "/gate/", meaning: "大门", example: "The gate is open.", level: "A1" },
  { word: "gather", phonetic: "/gather/", meaning: "聚集", example: "Gather around.", level: "A1" },
  { word: "general", phonetic: "/general/", meaning: "一般的", example: "In general.", level: "A1" },
  { word: "gentle", phonetic: "/gentle/", meaning: "温柔的", example: "A gentle voice.", level: "A1" },
  { word: "get", phonetic: "/get/", meaning: "得到", example: "Get the book.", level: "A1" },
  { word: "gift", phonetic: "/gift/", meaning: "礼物", example: "A birthday gift.", level: "A1" },
  { word: "girl", phonetic: "/girl/", meaning: "女孩", example: "A young girl.", level: "A1" },
  { word: "give", phonetic: "/give/", meaning: "给", example: "Give it to me.", level: "A1" },
  { word: "glad", phonetic: "/glad/", meaning: "高兴的", example: "I am glad.", level: "A1" },
  { word: "glass", phonetic: "/glass/", meaning: "玻璃", example: "A glass of water.", level: "A1" },
  { word: "global", phonetic: "/global/", meaning: "全球的", example: "A global issue.", level: "A1" },
  { word: "go", phonetic: "/go/", meaning: "去", example: "Go home.", level: "A1" },
  { word: "goal", phonetic: "/goal/", meaning: "目标", example: "Set a goal.", level: "A1" },
  { word: "gold", phonetic: "/gold/", meaning: "金子", example: "A gold ring.", level: "A1" },
  { word: "golden", phonetic: "/golden/", meaning: "金色的", example: "Golden hair.", level: "A1" },
  { word: "good", phonetic: "/good/", meaning: "好的", example: "A good book.", level: "A1" },
  { word: "government", phonetic: "/government/", meaning: "政府", example: "The government.", level: "A1" },
  { word: "grade", phonetic: "/grade/", meaning: "年级", example: "Grade five.", level: "A1" },
  { word: "grain", phonetic: "/grain/", meaning: "谷物", example: "Rice grain.", level: "A1" },
  { word: "grandfather", phonetic: "/grandfather/", meaning: "祖父", example: "My grandfather.", level: "A1" },
  { word: "grandmother", phonetic: "/grandmother/", meaning: "祖母", example: "My grandmother.", level: "A1" },
  { word: "grass", phonetic: "/grass/", meaning: "草", example: "Green grass.", level: "A1" },
  { word: "great", phonetic: "/great/", meaning: "伟大的", example: "A great idea.", level: "A1" },
  { word: "green", phonetic: "/green/", meaning: "绿色", example: "Green trees.", level: "A1" },
  { word: "greet", phonetic: "/greet/", meaning: "问候", example: "Greet your guest.", level: "A1" },
  { word: "ground", phonetic: "/ground/", meaning: "地面", example: "On the ground.", level: "A1" },
  { word: "group", phonetic: "/group/", meaning: "组", example: "A group of people.", level: "A1" },
  { word: "grow", phonetic: "/grow/", meaning: "生长", example: "Plants grow.", level: "A1" },
  { word: "guard", phonetic: "/guard/", meaning: "守卫", example: "A security guard.", level: "A1" },
  { word: "guess", phonetic: "/guess/", meaning: "猜", example: "Guess the answer.", level: "A1" },
  { word: "guest", phonetic: "/guest/", meaning: "客人", example: "Welcome, guest.", level: "A1" },
  { word: "guide", phonetic: "/guide/", meaning: "指南", example: "A travel guide.", level: "A1" },
  { word: "habit", phonetic: "/habit/", meaning: "习惯", example: "A good habit.", level: "A1" },
  { word: "hair", phonetic: "/hair/", meaning: "头发", example: "Long hair.", level: "A1" },
  { word: "half", phonetic: "/half/", meaning: "一半", example: "Half an hour.", level: "A1" },
  { word: "hall", phonetic: "/hall/", meaning: "大厅", example: "The main hall.", level: "A1" },
  { word: "hand", phonetic: "/hand/", meaning: "手", example: "Wash your hands.", level: "A1" },
  { word: "happen", phonetic: "/happen/", meaning: "发生", example: "What happened?", level: "A1" },
  { word: "happy", phonetic: "/happy/", meaning: "快乐的", example: "I am happy.", level: "A1" },
  { word: "hard", phonetic: "/hard/", meaning: "硬的", example: "Work hard.", level: "A1" },
  { word: "hat", phonetic: "/hat/", meaning: "帽子", example: "A red hat.", level: "A1" },
  { word: "hate", phonetic: "/hate/", meaning: "讨厌", example: "I hate waiting.", level: "A1" },
  { word: "head", phonetic: "/head/", meaning: "头", example: "My head hurts.", level: "A1" },
  { word: "health", phonetic: "/health/", meaning: "健康", example: "Good health.", level: "A1" },
  { word: "hear", phonetic: "/hear/", meaning: "听见", example: "I can hear you.", level: "A1" },
  { word: "heart", phonetic: "/heart/", meaning: "心", example: "A kind heart.", level: "A1" },
  { word: "heat", phonetic: "/heat/", meaning: "热", example: "The heat is strong.", level: "A1" },
  { word: "heavy", phonetic: "/heavy/", meaning: "重的", example: "A heavy bag.", level: "A1" },
  { word: "hello", phonetic: "/hello/", meaning: "你好", example: "Hello, friend.", level: "A1" },
  { word: "help", phonetic: "/help/", meaning: "帮助", example: "Help me, please.", level: "A1" },
  { word: "here", phonetic: "/here/", meaning: "这里", example: "Come here.", level: "A1" },
  { word: "hero", phonetic: "/hero/", meaning: "英雄", example: "A real hero.", level: "A1" },
  { word: "hide", phonetic: "/hide/", meaning: "隐藏", example: "Hide and seek.", level: "A1" },
  { word: "high", phonetic: "/high/", meaning: "高的", example: "A high building.", level: "A1" },
  { word: "hill", phonetic: "/hill/", meaning: "小山", example: "Climb the hill.", level: "A1" },
  { word: "history", phonetic: "/history/", meaning: "历史", example: "World history.", level: "A1" },
  { word: "hit", phonetic: "/hit/", meaning: "打", example: "Do not hit.", level: "A1" },
  { word: "hold", phonetic: "/hold/", meaning: "拿着", example: "Hold my hand.", level: "A1" },
  { word: "hole", phonetic: "/hole/", meaning: "洞", example: "A deep hole.", level: "A1" },
  { word: "holiday", phonetic: "/holiday/", meaning: "假期", example: "A happy holiday.", level: "A1" },
  { word: "home", phonetic: "/home/", meaning: "家", example: "Go home.", level: "A1" },
  { word: "honest", phonetic: "/honest/", meaning: "诚实的", example: "Be honest.", level: "A1" },
  { word: "hope", phonetic: "/hope/", meaning: "希望", example: "I hope so.", level: "A1" },
  { word: "horse", phonetic: "/horse/", meaning: "马", example: "Ride a horse.", level: "A1" },
  { word: "hospital", phonetic: "/hospital/", meaning: "医院", example: "Go to the hospital.", level: "A1" },
  { word: "hot", phonetic: "/hot/", meaning: "热的", example: "It is hot.", level: "A1" },
  { word: "hotel", phonetic: "/hotel/", meaning: "酒店", example: "Stay at a hotel.", level: "A1" },
  { word: "hour", phonetic: "/hour/", meaning: "小时", example: "One hour.", level: "A1" },
  { word: "house", phonetic: "/house/", meaning: "房子", example: "My house.", level: "A1" },
  { word: "huge", phonetic: "/huge/", meaning: "巨大的", example: "A huge building.", level: "A1" },
  { word: "human", phonetic: "/human/", meaning: "人类", example: "Human rights.", level: "A1" },
  { word: "hundred", phonetic: "/hundred/", meaning: "百", example: "One hundred.", level: "A1" },
  { word: "hungry", phonetic: "/hungry/", meaning: "饿的", example: "I am hungry.", level: "A1" },
  { word: "hunt", phonetic: "/hunt/", meaning: "打猎", example: "Hunt for food.", level: "A1" },
  { word: "hurry", phonetic: "/hurry/", meaning: "赶快", example: "Hurry up!", level: "A1" },
  { word: "hurt", phonetic: "/hurt/", meaning: "受伤", example: "I am hurt.", level: "A1" },
  { word: "husband", phonetic: "/husband/", meaning: "丈夫", example: "Her husband.", level: "A1" },
  { word: "idea", phonetic: "/idea/", meaning: "主意", example: "A good idea.", level: "A1" },
  { word: "identify", phonetic: "/identify/", meaning: "识别", example: "Identify the problem.", level: "A1" },
  { word: "ignore", phonetic: "/ignore/", meaning: "忽视", example: "Do not ignore it.", level: "A1" },
  { word: "ill", phonetic: "/ill/", meaning: "生病的", example: "She is ill.", level: "A1" },
  { word: "imagine", phonetic: "/imagine/", meaning: "想象", example: "Imagine that.", level: "A1" },
  { word: "important", phonetic: "/important/", meaning: "重要的", example: "Very important.", level: "A1" },
  { word: "impossible", phonetic: "/impossible/", meaning: "不可能的", example: "It is impossible.", level: "A1" },
  { word: "improve", phonetic: "/improve/", meaning: "提高", example: "Improve your skills.", level: "A1" },
  { word: "include", phonetic: "/include/", meaning: "包括", example: "Include me.", level: "A1" },
  { word: "increase", phonetic: "/increase/", meaning: "增加", example: "Increase the price.", level: "A1" },
  { word: "independent", phonetic: "/independent/", meaning: "独立的", example: "Be independent.", level: "A1" },
  { word: "industry", phonetic: "/industry/", meaning: "工业", example: "The car industry.", level: "A1" },
  { word: "influence", phonetic: "/influence/", meaning: "影响", example: "A good influence.", level: "A1" },
  { word: "information", phonetic: "/information/", meaning: "信息", example: "More information.", level: "A1" },
  { word: "inside", phonetic: "/inside/", meaning: "在里面", example: "Come inside.", level: "A1" },
  { word: "insist", phonetic: "/insist/", meaning: "坚持", example: "I insist.", level: "A1" },
  { word: "instead", phonetic: "/instead/", meaning: "代替", example: "Do this instead.", level: "A1" },
  { word: "interest", phonetic: "/interest/", meaning: "兴趣", example: "Show interest.", level: "A1" },
  { word: "interested", phonetic: "/interested/", meaning: "感兴趣的", example: "I am interested.", level: "A1" },
  { word: "interesting", phonetic: "/interesting/", meaning: "有趣的", example: "An interesting book.", level: "A1" },
  { word: "international", phonetic: "/international/", meaning: "国际的", example: "An international school.", level: "A1" },
  { word: "internet", phonetic: "/internet/", meaning: "互联网", example: "Use the internet.", level: "A1" },
  { word: "interview", phonetic: "/interview/", meaning: "面试", example: "A job interview.", level: "A1" },
  { word: "into", phonetic: "/into/", meaning: "进入", example: "Go into the room.", level: "A1" },
  { word: "introduce", phonetic: "/introduce/", meaning: "介绍", example: "Introduce yourself.", level: "A1" },
  { word: "invent", phonetic: "/invent/", meaning: "发明", example: "Invent something.", level: "A1" },
  { word: "invest", phonetic: "/invest/", meaning: "投资", example: "Invest wisely.", level: "A1" },
  { word: "invite", phonetic: "/invite/", meaning: "邀请", example: "Invite your friends.", level: "A1" },
  { word: "island", phonetic: "/island/", meaning: "岛屿", example: "A tropical island.", level: "A1" },
  { word: "issue", phonetic: "/issue/", meaning: "问题", example: "An important issue.", level: "A1" },
  { word: "item", phonetic: "/item/", meaning: "物品", example: "A useful item.", level: "A1" },
  { word: "jacket", phonetic: "/jacket/", meaning: "夹克", example: "A warm jacket.", level: "A1" },
  { word: "job", phonetic: "/job/", meaning: "工作", example: "A good job.", level: "A1" },
  { word: "join", phonetic: "/join/", meaning: "加入", example: "Join us.", level: "A1" },
  { word: "joke", phonetic: "/joke/", meaning: "笑话", example: "Tell a joke.", level: "A1" },
  { word: "journey", phonetic: "/journey/", meaning: "旅程", example: "A long journey.", level: "A1" },
  { word: "joy", phonetic: "/joy/", meaning: "快乐", example: "A moment of joy.", level: "A1" },
  { word: "judge", phonetic: "/judge/", meaning: "判断", example: "Do not judge.", level: "A1" },
  { word: "juice", phonetic: "/juice/", meaning: "果汁", example: "Orange juice.", level: "A1" },
  { word: "jump", phonetic: "/jump/", meaning: "跳", example: "Jump high.", level: "A1" },
  { word: "just", phonetic: "/just/", meaning: "只是", example: "Just a moment.", level: "A1" },
  { word: "keep", phonetic: "/keep/", meaning: "保持", example: "Keep quiet.", level: "A1" },
  { word: "key", phonetic: "/key/", meaning: "钥匙", example: "The key is here.", level: "A1" },
  { word: "kid", phonetic: "/kid/", meaning: "孩子", example: "A happy kid.", level: "A1" },
  { word: "kill", phonetic: "/kill/", meaning: "杀死", example: "Do not kill.", level: "A1" },
  { word: "kind", phonetic: "/kind/", meaning: "善良的", example: "A kind person.", level: "A1" },
  { word: "king", phonetic: "/king/", meaning: "国王", example: "The king rules.", level: "A1" },
  { word: "kitchen", phonetic: "/kitchen/", meaning: "厨房", example: "Cook in the kitchen.", level: "A1" },
  { word: "knee", phonetic: "/knee/", meaning: "膝盖", example: "Bend your knee.", level: "A1" },
  { word: "knife", phonetic: "/knife/", meaning: "刀", example: "A sharp knife.", level: "A1" },
  { word: "knock", phonetic: "/knock/", meaning: "敲", example: "Knock on the door.", level: "A1" },
  { word: "know", phonetic: "/know/", meaning: "知道", example: "I know the answer.", level: "A1" },
  { word: "knowledge", phonetic: "/knowledge/", meaning: "知识", example: "Knowledge is power.", level: "A1" },
  { word: "land", phonetic: "/land/", meaning: "土地", example: "A piece of land.", level: "A1" },
  { word: "language", phonetic: "/language/", meaning: "语言", example: "A foreign language.", level: "A1" },
  { word: "large", phonetic: "/large/", meaning: "大的", example: "A large house.", level: "A1" },
  { word: "last", phonetic: "/last/", meaning: "最后的", example: "The last one.", level: "A1" },
  { word: "late", phonetic: "/late/", meaning: "晚的", example: "You are late.", level: "A1" },
  { word: "later", phonetic: "/later/", meaning: "后来", example: "See you later.", level: "A1" },
  { word: "laugh", phonetic: "/laugh/", meaning: "笑", example: "Do not laugh.", level: "A1" },
  { word: "law", phonetic: "/law/", meaning: "法律", example: "Follow the law.", level: "A1" },
  { word: "lead", phonetic: "/lead/", meaning: "领导", example: "Lead the team.", level: "A1" },
  { word: "leader", phonetic: "/leader/", meaning: "领导者", example: "A strong leader.", level: "A1" },
  { word: "learn", phonetic: "/learn/", meaning: "学习", example: "Learn English.", level: "A1" },
  { word: "leave", phonetic: "/leave/", meaning: "离开", example: "I must leave.", level: "A1" },
  { word: "left", phonetic: "/left/", meaning: "左边", example: "Turn left.", level: "A1" },
  { word: "leg", phonetic: "/leg/", meaning: "腿", example: "My leg hurts.", level: "A1" },
  { word: "lend", phonetic: "/lend/", meaning: "借出", example: "Lend me a pen.", level: "A1" },
  { word: "less", phonetic: "/less/", meaning: "更少", example: "Less sugar.", level: "A1" },
  { word: "lesson", phonetic: "/lesson/", meaning: "课", example: "Today's lesson.", level: "A1" },
  { word: "let", phonetic: "/let/", meaning: "让", example: "Let me help.", level: "A1" },
  { word: "letter", phonetic: "/letter/", meaning: "信", example: "Write a letter.", level: "A1" },
  { word: "level", phonetic: "/level/", meaning: "水平", example: "A high level.", level: "A1" },
  { word: "library", phonetic: "/library/", meaning: "图书馆", example: "Go to the library.", level: "A1" },
  { word: "lie", phonetic: "/lie/", meaning: "说谎", example: "Do not lie.", level: "A1" },
  { word: "life", phonetic: "/life/", meaning: "生活", example: "A happy life.", level: "A1" },
  { word: "lift", phonetic: "/lift/", meaning: "举起", example: "Lift the box.", level: "A1" },
  { word: "light", phonetic: "/light/", meaning: "光", example: "Turn on the light.", level: "A1" },
  { word: "like", phonetic: "/like/", meaning: "喜欢", example: "I like it.", level: "A1" },
  { word: "limit", phonetic: "/limit/", meaning: "限制", example: "No limit.", level: "A1" },
  { word: "line", phonetic: "/line/", meaning: "线", example: "A straight line.", level: "A1" },
  { word: "list", phonetic: "/list/", meaning: "列表", example: "A shopping list.", level: "A1" },
  { word: "listen", phonetic: "/listen/", meaning: "听", example: "Listen carefully.", level: "A1" },
  { word: "little", phonetic: "/little/", meaning: "小的", example: "A little dog.", level: "A1" },
  { word: "live", phonetic: "/live/", meaning: "生活", example: "I live here.", level: "A1" },
  { word: "local", phonetic: "/local/", meaning: "当地的", example: "Local food.", level: "A1" },
  { word: "lock", phonetic: "/lock/", meaning: "锁", example: "Lock the door.", level: "A1" },
  { word: "long", phonetic: "/long/", meaning: "长的", example: "A long road.", level: "A1" },
  { word: "look", phonetic: "/look/", meaning: "看", example: "Look at this.", level: "A1" },
  { word: "lose", phonetic: "/lose/", meaning: "失去", example: "Do not lose it.", level: "A1" },
  { word: "lot", phonetic: "/lot/", meaning: "许多", example: "A lot of fun.", level: "A1" },
  { word: "love", phonetic: "/love/", meaning: "爱", example: "I love you.", level: "A1" },
  { word: "low", phonetic: "/low/", meaning: "低的", example: "A low price.", level: "A1" },
  { word: "luck", phonetic: "/luck/", meaning: "运气", example: "Good luck!", level: "A1" },
  { word: "lunch", phonetic: "/lunch/", meaning: "午餐", example: "Have lunch.", level: "A1" },
  { word: "machine", phonetic: "/machine/", meaning: "机器", example: "A washing machine.", level: "A1" },
  { word: "magazine", phonetic: "/magazine/", meaning: "杂志", example: "Read a magazine.", level: "A1" },
  { word: "main", phonetic: "/main/", meaning: "主要的", example: "The main road.", level: "A1" },
  { word: "major", phonetic: "/major/", meaning: "主要的", example: "A major problem.", level: "A1" },
  { word: "make", phonetic: "/make/", meaning: "制作", example: "Make a cake.", level: "A1" },
  { word: "man", phonetic: "/man/", meaning: "男人", example: "A tall man.", level: "A1" },
  { word: "manage", phonetic: "/manage/", meaning: "管理", example: "Manage your time.", level: "A1" },
  { word: "manager", phonetic: "/manager/", meaning: "经理", example: "The store manager.", level: "A1" },
  { word: "manner", phonetic: "/manner/", meaning: "方式", example: "In a polite manner.", level: "A1" },
  { word: "many", phonetic: "/many/", meaning: "许多", example: "Many people.", level: "A1" },
  { word: "market", phonetic: "/market/", meaning: "市场", example: "Go to the market.", level: "A1" },
  { word: "married", phonetic: "/married/", meaning: "已婚的", example: "They are married.", level: "A1" },
  { word: "matter", phonetic: "/matter/", meaning: "事情", example: "It does not matter.", level: "A1" },
  { word: "may", phonetic: "/may/", meaning: "可能", example: "It may rain.", level: "A1" },
  { word: "maybe", phonetic: "/maybe/", meaning: "也许", example: "Maybe tomorrow.", level: "A1" },
  { word: "me", phonetic: "/me/", meaning: "我", example: "Give it to me.", level: "A1" },
  { word: "meal", phonetic: "/meal/", meaning: "一顿饭", example: "A healthy meal.", level: "A1" },
  { word: "mean", phonetic: "/mean/", meaning: "意思是", example: "What does it mean?", level: "A1" },
  { word: "meaning", phonetic: "/meaning/", meaning: "意思", example: "The meaning of life.", level: "A1" },
  { word: "measure", phonetic: "/measure/", meaning: "测量", example: "Measure the length.", level: "A1" },
  { word: "meat", phonetic: "/meat/", meaning: "肉", example: "Red meat.", level: "A1" },
  { word: "medicine", phonetic: "/medicine/", meaning: "药", example: "Take your medicine.", level: "A1" },
  { word: "meet", phonetic: "/meet/", meaning: "遇见", example: "Nice to meet you.", level: "A1" },
  { word: "meeting", phonetic: "/meeting/", meaning: "会议", example: "A business meeting.", level: "A1" },
  { word: "member", phonetic: "/member/", meaning: "成员", example: "A team member.", level: "A1" },
  { word: "memory", phonetic: "/memory/", meaning: "记忆", example: "A good memory.", level: "A1" },
  { word: "mention", phonetic: "/mention/", meaning: "提到", example: "Do not mention it.", level: "A1" },
  { word: "message", phonetic: "/message/", meaning: "消息", example: "Leave a message.", level: "A1" },
  { word: "method", phonetic: "/method/", meaning: "方法", example: "A new method.", level: "A1" },
  { word: "middle", phonetic: "/middle/", meaning: "中间", example: "In the middle.", level: "A1" },
  { word: "might", phonetic: "/might/", meaning: "可能", example: "It might happen.", level: "A1" },
  { word: "mile", phonetic: "/mile/", meaning: "英里", example: "A long mile.", level: "A1" },
  { word: "milk", phonetic: "/milk/", meaning: "牛奶", example: "A glass of milk.", level: "A1" },
  { word: "million", phonetic: "/million/", meaning: "百万", example: "One million.", level: "A1" },
  { word: "mind", phonetic: "/mind/", meaning: "介意", example: "Do you mind?", level: "A1" },
  { word: "mine", phonetic: "/mine/", meaning: "我的", example: "This is mine.", level: "A1" },
  { word: "minute", phonetic: "/minute/", meaning: "分钟", example: "Wait a minute.", level: "A1" },
  { word: "miss", phonetic: "/miss/", meaning: "错过", example: "Do not miss it.", level: "A1" },
  { word: "mistake", phonetic: "/mistake/", meaning: "错误", example: "A common mistake.", level: "A1" },
  { word: "mix", phonetic: "/mix/", meaning: "混合", example: "Mix the ingredients.", level: "A1" },
  { word: "modern", phonetic: "/modern/", meaning: "现代的", example: "Modern technology.", level: "A1" },
  { word: "moment", phonetic: "/moment/", meaning: "时刻", example: "At this moment.", level: "A1" },
  { word: "money", phonetic: "/money/", meaning: "金钱", example: "Save your money.", level: "A1" },
  { word: "month", phonetic: "/month/", meaning: "月", example: "This month.", level: "A1" },
  { word: "moon", phonetic: "/moon/", meaning: "月亮", example: "The moon is bright.", level: "A1" },
  { word: "more", phonetic: "/more/", meaning: "更多", example: "I need more.", level: "A1" },
  { word: "morning", phonetic: "/morning/", meaning: "早上", example: "Good morning.", level: "A1" },
  { word: "most", phonetic: "/most/", meaning: "最多", example: "Most people.", level: "A1" },
  { word: "mother", phonetic: "/mother/", meaning: "母亲", example: "My mother.", level: "A1" },
  { word: "mountain", phonetic: "/mountain/", meaning: "山", example: "Climb the mountain.", level: "A1" },
  { word: "mouth", phonetic: "/mouth/", meaning: "嘴", example: "Open your mouth.", level: "A1" },
  { word: "move", phonetic: "/move/", meaning: "移动", example: "Move the table.", level: "A1" },
  { word: "movie", phonetic: "/movie/", meaning: "电影", example: "Watch a movie.", level: "A1" },
  { word: "much", phonetic: "/much/", meaning: "许多", example: "Too much.", level: "A1" },
  { word: "music", phonetic: "/music/", meaning: "音乐", example: "Listen to music.", level: "A1" },
  { word: "must", phonetic: "/must/", meaning: "必须", example: "You must go.", level: "A1" },
  { word: "my", phonetic: "/my/", meaning: "我的", example: "My name is Tom.", level: "A1" },
  { word: "myself", phonetic: "/myself/", meaning: "我自己", example: "I did it myself.", level: "A1" },
  { word: "name", phonetic: "/name/", meaning: "名字", example: "What is your name?", level: "A1" },
  { word: "nation", phonetic: "/nation/", meaning: "国家", example: "A great nation.", level: "A1" },
  { word: "national", phonetic: "/national/", meaning: "国家的", example: "A national park.", level: "A1" },
  { word: "natural", phonetic: "/natural/", meaning: "自然的", example: "Natural beauty.", level: "A1" },
  { word: "nature", phonetic: "/nature/", meaning: "自然", example: "Love nature.", level: "A1" },
  { word: "near", phonetic: "/near/", meaning: "近的", example: "It is near.", level: "A1" },
  { word: "nearly", phonetic: "/nearly/", meaning: "几乎", example: "I nearly forgot.", level: "A1" },
  { word: "necessary", phonetic: "/necessary/", meaning: "必要的", example: "It is necessary.", level: "A1" },
  { word: "neck", phonetic: "/neck/", meaning: "脖子", example: "A long neck.", level: "A1" },
  { word: "need", phonetic: "/need/", meaning: "需要", example: "I need help.", level: "A1" },
  { word: "neighbor", phonetic: "/neighbor/", meaning: "邻居", example: "My neighbor is kind.", level: "A1" },
  { word: "neither", phonetic: "/neither/", meaning: "两者都不", example: "Neither is correct.", level: "A1" },
  { word: "nervous", phonetic: "/nervous/", meaning: "紧张的", example: "I am nervous.", level: "A1" },
  { word: "never", phonetic: "/never/", meaning: "从不", example: "I never give up.", level: "A1" },
  { word: "new", phonetic: "/new/", meaning: "新的", example: "A new book.", level: "A1" },
  { word: "news", phonetic: "/news/", meaning: "新闻", example: "Good news.", level: "A1" },
  { word: "newspaper", phonetic: "/newspaper/", meaning: "报纸", example: "Read the newspaper.", level: "A1" },
  { word: "next", phonetic: "/next/", meaning: "下一个", example: "Next time.", level: "A1" },
  { word: "nice", phonetic: "/nice/", meaning: "好的", example: "Nice to meet you.", level: "A1" },
  { word: "night", phonetic: "/night/", meaning: "晚上", example: "Good night.", level: "A1" },
  { word: "nine", phonetic: "/nine/", meaning: "九", example: "Nine o'clock.", level: "A1" },
  { word: "no", phonetic: "/no/", meaning: "不", example: "No, thank you.", level: "A1" },
  { word: "nobody", phonetic: "/nobody/", meaning: "没有人", example: "Nobody is here.", level: "A1" },
  { word: "noise", phonetic: "/noise/", meaning: "噪音", example: "A loud noise.", level: "A1" },
  { word: "none", phonetic: "/none/", meaning: "没有", example: "None of them.", level: "A1" },
  { word: "nor", phonetic: "/nor/", meaning: "也不", example: "Neither nor.", level: "A1" },
  { word: "normal", phonetic: "/normal/", meaning: "正常的", example: "A normal day.", level: "A1" },
  { word: "north", phonetic: "/north/", meaning: "北方", example: "Go north.", level: "A1" },
  { word: "nose", phonetic: "/nose/", meaning: "鼻子", example: "A big nose.", level: "A1" },
  { word: "not", phonetic: "/not/", meaning: "不", example: "I am not sure.", level: "A1" },
  { word: "note", phonetic: "/note/", meaning: "笔记", example: "Take notes.", level: "A1" },
  { word: "nothing", phonetic: "/nothing/", meaning: "没有东西", example: "Nothing happened.", level: "A1" },
  { word: "notice", phonetic: "/notice/", meaning: "注意到", example: "Notice the difference.", level: "A1" },
  { word: "now", phonetic: "/now/", meaning: "现在", example: "Right now.", level: "A1" },
  { word: "number", phonetic: "/number/", meaning: "数字", example: "A phone number.", level: "A1" },
  { word: "nurse", phonetic: "/nurse/", meaning: "护士", example: "A kind nurse.", level: "A1" },
  { word: "object", phonetic: "/object/", meaning: "物体", example: "A strange object.", level: "A1" },
  { word: "occur", phonetic: "/occur/", meaning: "发生", example: "Accidents occur.", level: "A1" },
  { word: "ocean", phonetic: "/ocean/", meaning: "海洋", example: "The deep ocean.", level: "A1" },
  { word: "of", phonetic: "/of/", meaning: "的", example: "A cup of tea.", level: "A1" },
  { word: "off", phonetic: "/off/", meaning: "离开", example: "Turn off the light.", level: "A1" },
  { word: "offer", phonetic: "/offer/", meaning: "提供", example: "I offer help.", level: "A1" },
  { word: "office", phonetic: "/office/", meaning: "办公室", example: "Go to the office.", level: "A1" },
  { word: "officer", phonetic: "/officer/", meaning: "军官", example: "A police officer.", level: "A1" },
  { word: "official", phonetic: "/official/", meaning: "官方的", example: "An official statement.", level: "A1" },
  { word: "often", phonetic: "/often/", meaning: "经常", example: "I often read.", level: "A1" },
  { word: "oil", phonetic: "/oil/", meaning: "油", example: "Cooking oil.", level: "A1" },
  { word: "old", phonetic: "/old/", meaning: "老的", example: "An old man.", level: "A1" },
  { word: "on", phonetic: "/on/", meaning: "在…上", example: "On the table.", level: "A1" },
  { word: "once", phonetic: "/once/", meaning: "一次", example: "Once upon a time.", level: "A1" },
  { word: "one", phonetic: "/one/", meaning: "一", example: "One person.", level: "A1" },
  { word: "only", phonetic: "/only/", meaning: "只有", example: "Only you.", level: "A1" },
  { word: "open", phonetic: "/open/", meaning: "打开", example: "Open the window.", level: "A1" },
  { word: "operation", phonetic: "/operation/", meaning: "手术", example: "A successful operation.", level: "A1" },
  { word: "opinion", phonetic: "/opinion/", meaning: "意见", example: "In my opinion.", level: "A1" },
  { word: "opportunity", phonetic: "/opportunity/", meaning: "机会", example: "A great opportunity.", level: "A1" },
  { word: "opposite", phonetic: "/opposite/", meaning: "相反的", example: "The opposite side.", level: "A1" },
  { word: "or", phonetic: "/or/", meaning: "或者", example: "Yes or no?", level: "A1" },
  { word: "orange", phonetic: "/orange/", meaning: "橙子", example: "An orange juice.", level: "A1" },
  { word: "order", phonetic: "/order/", meaning: "命令", example: "Follow the order.", level: "A1" },
  { word: "ordinary", phonetic: "/ordinary/", meaning: "普通的", example: "An ordinary day.", level: "A1" },
  { word: "organization", phonetic: "/organization/", meaning: "组织", example: "A charity organization.", level: "A1" },
  { word: "other", phonetic: "/other/", meaning: "其他的", example: "Other people.", level: "A1" },
  { word: "otherwise", phonetic: "/otherwise/", meaning: "否则", example: "Hurry, otherwise we will be late.", level: "A1" },
  { word: "our", phonetic: "/our/", meaning: "我们的", example: "Our school.", level: "A1" },
  { word: "out", phonetic: "/out/", meaning: "外面", example: "Go out.", level: "A1" },
  { word: "outside", phonetic: "/outside/", meaning: "在外面", example: "Play outside.", level: "A1" },
  { word: "over", phonetic: "/over/", meaning: "在…上方", example: "Over the rainbow.", level: "A1" },
  { word: "own", phonetic: "/own/", meaning: "自己的", example: "My own room.", level: "A1" },
  { word: "owner", phonetic: "/owner/", meaning: "主人", example: "The house owner.", level: "A1" },
  { word: "page", phonetic: "/page/", meaning: "页", example: "Turn the page.", level: "A1" },
  { word: "pain", phonetic: "/pain/", meaning: "痛苦", example: "A lot of pain.", level: "A1" },
  { word: "paint", phonetic: "/paint/", meaning: "画", example: "Paint the wall.", level: "A1" },
  { word: "pair", phonetic: "/pair/", meaning: "一双", example: "A pair of shoes.", level: "A1" },
  { word: "palace", phonetic: "/palace/", meaning: "宫殿", example: "A beautiful palace.", level: "A1" },
  { word: "pan", phonetic: "/pan/", meaning: "平底锅", example: "A frying pan.", level: "A1" },
  { word: "paper", phonetic: "/paper/", meaning: "纸", example: "A piece of paper.", level: "A1" },
  { word: "parent", phonetic: "/parent/", meaning: "父母", example: "My parents.", level: "A1" },
  { word: "park", phonetic: "/park/", meaning: "公园", example: "Go to the park.", level: "A1" },
  { word: "part", phonetic: "/part/", meaning: "部分", example: "A large part.", level: "A1" },
  { word: "partner", phonetic: "/partner/", meaning: "伙伴", example: "A business partner.", level: "A1" },
  { word: "party", phonetic: "/party/", meaning: "派对", example: "A birthday party.", level: "A1" },
  { word: "pass", phonetic: "/pass/", meaning: "通过", example: "Pass the exam.", level: "A1" },
  { word: "passenger", phonetic: "/passenger/", meaning: "乘客", example: "A plane passenger.", level: "A1" },
  { word: "passport", phonetic: "/passport/", meaning: "护照", example: "Show your passport.", level: "A1" },
  { word: "past", phonetic: "/past/", meaning: "过去", example: "In the past.", level: "A1" },
  { word: "path", phonetic: "/path/", meaning: "小路", example: "A narrow path.", level: "A1" },
  { word: "patient", phonetic: "/patient/", meaning: "病人", example: "The patient is well.", level: "A1" },
  { word: "pattern", phonetic: "/pattern/", meaning: "图案", example: "A beautiful pattern.", level: "A1" },
  { word: "pay", phonetic: "/pay/", meaning: "支付", example: "Pay the bill.", level: "A1" },
  { word: "peace", phonetic: "/peace/", meaning: "和平", example: "World peace.", level: "A1" },
  { word: "pen", phonetic: "/pen/", meaning: "笔", example: "A blue pen.", level: "A1" },
  { word: "pencil", phonetic: "/pencil/", meaning: "铅笔", example: "A sharp pencil.", level: "A1" },
  { word: "people", phonetic: "/people/", meaning: "人们", example: "Many people.", level: "A1" },
  { word: "per", phonetic: "/per/", meaning: "每", example: "Once per day.", level: "A1" },
  { word: "perfect", phonetic: "/perfect/", meaning: "完美的", example: "A perfect day.", level: "A1" },
  { word: "perhaps", phonetic: "/perhaps/", meaning: "也许", example: "Perhaps tomorrow.", level: "A1" },
  { word: "period", phonetic: "/period/", meaning: "时期", example: "A long period.", level: "A1" },
  { word: "permission", phonetic: "/permission/", meaning: "许可", example: "Ask for permission.", level: "A1" },
  { word: "person", phonetic: "/person/", meaning: "人", example: "A kind person.", level: "A1" },
  { word: "personal", phonetic: "/personal/", meaning: "个人的", example: "Personal space.", level: "A1" },
  { word: "phone", phonetic: "/phone/", meaning: "电话", example: "Call my phone.", level: "A1" },
  { word: "photo", phonetic: "/photo/", meaning: "照片", example: "Take a photo.", level: "A1" },
  { word: "physics", phonetic: "/physics/", meaning: "物理", example: "Study physics.", level: "A1" },
  { word: "piano", phonetic: "/piano/", meaning: "钢琴", example: "Play the piano.", level: "A1" },
  { word: "pick", phonetic: "/pick/", meaning: "挑选", example: "Pick a color.", level: "A1" },
  { word: "picture", phonetic: "/picture/", meaning: "图片", example: "A beautiful picture.", level: "A1" },
  { word: "piece", phonetic: "/piece/", meaning: "一片", example: "A piece of cake.", level: "A1" },
  { word: "pig", phonetic: "/pig/", meaning: "猪", example: "A pink pig.", level: "A1" },
  { word: "place", phonetic: "/place/", meaning: "地方", example: "A nice place.", level: "A1" },
  { word: "plan", phonetic: "/plan/", meaning: "计划", example: "Make a plan.", level: "A1" },
  { word: "plane", phonetic: "/plane/", meaning: "飞机", example: "A big plane.", level: "A1" },
  { word: "plant", phonetic: "/plant/", meaning: "植物", example: "Water the plant.", level: "A1" },
  { word: "plate", phonetic: "/plate/", meaning: "盘子", example: "A dinner plate.", level: "A1" },
  { word: "play", phonetic: "/play/", meaning: "玩", example: "Play a game.", level: "A1" },
  { word: "player", phonetic: "/player/", meaning: "选手", example: "A football player.", level: "A1" },
  { word: "please", phonetic: "/please/", meaning: "请", example: "Please help me.", level: "A1" },
  { word: "pleasure", phonetic: "/pleasure/", meaning: "快乐", example: "My pleasure.", level: "A1" },
  { word: "plenty", phonetic: "/plenty/", meaning: "大量", example: "Plenty of time.", level: "A1" },
  { word: "pocket", phonetic: "/pocket/", meaning: "口袋", example: "In my pocket.", level: "A1" },
  { word: "poem", phonetic: "/poem/", meaning: "诗", example: "Write a poem.", level: "A1" },
  { word: "point", phonetic: "/point/", meaning: "点", example: "A starting point.", level: "A1" },
  { word: "police", phonetic: "/police/", meaning: "警察", example: "Call the police.", level: "A1" },
  { word: "polite", phonetic: "/polite/", meaning: "有礼貌的", example: "Be polite.", level: "A1" },
  { word: "pool", phonetic: "/pool/", meaning: "游泳池", example: "A swimming pool.", level: "A1" },
  { word: "poor", phonetic: "/poor/", meaning: "贫穷的", example: "Help the poor.", level: "A1" },
  { word: "popular", phonetic: "/popular/", meaning: "流行的", example: "A popular song.", level: "A1" },
  { word: "position", phonetic: "/position/", meaning: "位置", example: "A good position.", level: "A1" },
  { word: "positive", phonetic: "/positive/", meaning: "积极的", example: "A positive attitude.", level: "A1" },
  { word: "possible", phonetic: "/possible/", meaning: "可能的", example: "Anything is possible.", level: "A1" },
  { word: "post", phonetic: "/post/", meaning: "邮寄", example: "Post a letter.", level: "A1" },
  { word: "pot", phonetic: "/pot/", meaning: "锅", example: "A cooking pot.", level: "A1" },
  { word: "potato", phonetic: "/potato/", meaning: "土豆", example: "Mashed potatoes.", level: "A1" },
  { word: "pound", phonetic: "/pound/", meaning: "英镑", example: "Five pounds.", level: "A1" },
  { word: "pour", phonetic: "/pour/", meaning: "倒", example: "Pour the water.", level: "A1" },
  { word: "power", phonetic: "/power/", meaning: "力量", example: "Knowledge is power.", level: "A1" },
  { word: "practice", phonetic: "/practice/", meaning: "练习", example: "Practice makes perfect.", level: "A1" },
  { word: "pray", phonetic: "/pray/", meaning: "祈祷", example: "I pray for peace.", level: "A1" },
  { word: "prefer", phonetic: "/prefer/", meaning: "更喜欢", example: "I prefer tea.", level: "A1" },
  { word: "prepare", phonetic: "/prepare/", meaning: "准备", example: "Prepare for the exam.", level: "A1" },
  { word: "present", phonetic: "/present/", meaning: "礼物", example: "A birthday present.", level: "A1" },
  { word: "president", phonetic: "/president/", meaning: "总统", example: "The school president.", level: "A1" },
  { word: "press", phonetic: "/press/", meaning: "按", example: "Press the button.", level: "A1" },
  { word: "pretend", phonetic: "/pretend/", meaning: "假装", example: "Pretend to be happy.", level: "A1" },
  { word: "pretty", phonetic: "/pretty/", meaning: "漂亮的", example: "A pretty girl.", level: "A1" },
  { word: "prevent", phonetic: "/prevent/", meaning: "阻止", example: "Prevent accidents.", level: "A1" },
  { word: "price", phonetic: "/price/", meaning: "价格", example: "A fair price.", level: "A1" },
  { word: "pride", phonetic: "/pride/", meaning: "骄傲", example: "A sense of pride.", level: "A1" },
  { word: "primary", phonetic: "/primary/", meaning: "主要的", example: "A primary school.", level: "A1" },
  { word: "prince", phonetic: "/prince/", meaning: "王子", example: "A young prince.", level: "A1" },
  { word: "princess", phonetic: "/princess/", meaning: "公主", example: "A beautiful princess.", level: "A1" },
  { word: "principle", phonetic: "/principle/", meaning: "原则", example: "A basic principle.", level: "A1" },
  { word: "print", phonetic: "/print/", meaning: "打印", example: "Print the document.", level: "A1" },
  { word: "prison", phonetic: "/prison/", meaning: "监狱", example: "Go to prison.", level: "A1" },
  { word: "private", phonetic: "/private/", meaning: "私人的", example: "A private room.", level: "A1" },
  { word: "prize", phonetic: "/prize/", meaning: "奖品", example: "Win a prize.", level: "A1" },
  { word: "probably", phonetic: "/probably/", meaning: "可能", example: "Probably not.", level: "A1" },
  { word: "problem", phonetic: "/problem/", meaning: "问题", example: "Solve the problem.", level: "A1" },
  { word: "process", phonetic: "/process/", meaning: "过程", example: "A long process.", level: "A1" },
  { word: "produce", phonetic: "/produce/", meaning: "生产", example: "Produce goods.", level: "A1" },
  { word: "product", phonetic: "/product/", meaning: "产品", example: "A new product.", level: "A1" },
  { word: "production", phonetic: "/production/", meaning: "生产", example: "Mass production.", level: "A1" },
  { word: "professor", phonetic: "/professor/", meaning: "教授", example: "A university professor.", level: "A1" },
  { word: "program", phonetic: "/program/", meaning: "程序", example: "A computer program.", level: "A1" },
  { word: "progress", phonetic: "/progress/", meaning: "进步", example: "Make progress.", level: "A1" },
  { word: "project", phonetic: "/project/", meaning: "项目", example: "A school project.", level: "A1" },
  { word: "promise", phonetic: "/promise/", meaning: "承诺", example: "Keep your promise.", level: "A1" },
  { word: "proper", phonetic: "/proper/", meaning: "适当的", example: "A proper answer.", level: "A1" },
  { word: "protect", phonetic: "/protect/", meaning: "保护", example: "Protect the environment.", level: "A1" },
  { word: "proud", phonetic: "/proud/", meaning: "骄傲的", example: "I am proud of you.", level: "A1" },
  { word: "prove", phonetic: "/prove/", meaning: "证明", example: "Prove your point.", level: "A1" },
  { word: "provide", phonetic: "/provide/", meaning: "提供", example: "Provide information.", level: "A1" },
  { word: "public", phonetic: "/public/", meaning: "公共的", example: "A public park.", level: "A1" },
  { word: "pull", phonetic: "/pull/", meaning: "拉", example: "Pull the rope.", level: "A1" },
  { word: "punish", phonetic: "/punish/", meaning: "惩罚", example: "Punish the crime.", level: "A1" },
  { word: "pupil", phonetic: "/pupil/", meaning: "学生", example: "A school pupil.", level: "A1" },
  { word: "purpose", phonetic: "/purpose/", meaning: "目的", example: "The main purpose.", level: "A1" },
  { word: "push", phonetic: "/push/", meaning: "推", example: "Push the door.", level: "A1" },
  { word: "put", phonetic: "/put/", meaning: "放", example: "Put it down.", level: "A1" },
  { word: "quality", phonetic: "/quality/", meaning: "质量", example: "High quality.", level: "A1" },
  { word: "quantity", phonetic: "/quantity/", meaning: "数量", example: "A large quantity.", level: "A1" },
  { word: "quarter", phonetic: "/quarter/", meaning: "四分之一", example: "A quarter of an hour.", level: "A1" },
  { word: "queen", phonetic: "/queen/", meaning: "女王", example: "The queen rules.", level: "A1" },
  { word: "question", phonetic: "/question/", meaning: "问题", example: "Ask a question.", level: "A1" },
  { word: "quick", phonetic: "/quick/", meaning: "快的", example: "A quick answer.", level: "A1" },
  { word: "quickly", phonetic: "/quickly/", meaning: "快速地", example: "Run quickly.", level: "A1" },
  { word: "quiet", phonetic: "/quiet/", meaning: "安静的", example: "Be quiet.", level: "A1" },
  { word: "quite", phonetic: "/quite/", meaning: "相当", example: "Quite good.", level: "A1" },
  { word: "race", phonetic: "/race/", meaning: "比赛", example: "A running race.", level: "A1" },
  { word: "rain", phonetic: "/rain/", meaning: "雨", example: "Heavy rain.", level: "A1" },
  { word: "raise", phonetic: "/raise/", meaning: "举起", example: "Raise your hand.", level: "A1" },
  { word: "rapid", phonetic: "/rapid/", meaning: "快速的", example: "A rapid change.", level: "A1" },
  { word: "rather", phonetic: "/rather/", meaning: "宁愿", example: "I would rather stay.", level: "A1" },
  { word: "reach", phonetic: "/reach/", meaning: "到达", example: "Reach the goal.", level: "A1" },
  { word: "read", phonetic: "/read/", meaning: "阅读", example: "Read a book.", level: "A1" },
  { word: "ready", phonetic: "/ready/", meaning: "准备好的", example: "Are you ready?", level: "A1" },
  { word: "real", phonetic: "/real/", meaning: "真实的", example: "A real story.", level: "A1" },
  { word: "realize", phonetic: "/realize/", meaning: "意识到", example: "I realize now.", level: "A1" },
  { word: "really", phonetic: "/really/", meaning: "真的", example: "I really like it.", level: "A1" },
  { word: "reason", phonetic: "/reason/", meaning: "原因", example: "A good reason.", level: "A1" },
  { word: "receive", phonetic: "/receive/", meaning: "收到", example: "Receive a gift.", level: "A1" },
  { word: "recent", phonetic: "/recent/", meaning: "最近的", example: "A recent event.", level: "A1" },
  { word: "recently", phonetic: "/recently/", meaning: "最近", example: "Recently, I traveled.", level: "A1" },
  { word: "recognize", phonetic: "/recognize/", meaning: "认出", example: "I recognize you.", level: "A1" },
  { word: "record", phonetic: "/record/", meaning: "记录", example: "A world record.", level: "A1" },
  { word: "red", phonetic: "/red/", meaning: "红色", example: "A red rose.", level: "A1" },
  { word: "reduce", phonetic: "/reduce/", meaning: "减少", example: "Reduce waste.", level: "A1" },
  { word: "refer", phonetic: "/refer/", meaning: "参考", example: "Refer to the book.", level: "A1" },
  { word: "refuse", phonetic: "/refuse/", meaning: "拒绝", example: "I refuse.", level: "A1" },
  { word: "region", phonetic: "/region/", meaning: "地区", example: "A mountain region.", level: "A1" },
  { word: "regular", phonetic: "/regular/", meaning: "定期的", example: "A regular customer.", level: "A1" },
  { word: "relation", phonetic: "/relation/", meaning: "关系", example: "A good relation.", level: "A1" },
  { word: "remain", phonetic: "/remain/", meaning: "保持", example: "Remain calm.", level: "A1" },
  { word: "remember", phonetic: "/remember/", meaning: "记住", example: "Remember me.", level: "A1" },
  { word: "remove", phonetic: "/remove/", meaning: "移除", example: "Remove the lid.", level: "A1" },
  { word: "repair", phonetic: "/repair/", meaning: "修理", example: "Repair the car.", level: "A1" },
  { word: "repeat", phonetic: "/repeat/", meaning: "重复", example: "Repeat after me.", level: "A1" },
  { word: "replace", phonetic: "/replace/", meaning: "替换", example: "Replace the part.", level: "A1" },
  { word: "reply", phonetic: "/reply/", meaning: "回答", example: "A quick reply.", level: "A1" },
  { word: "report", phonetic: "/report/", meaning: "报告", example: "Write a report.", level: "A1" },
  { word: "represent", phonetic: "/represent/", meaning: "代表", example: "Represent your team.", level: "A1" },
  { word: "require", phonetic: "/require/", meaning: "需要", example: "It requires effort.", level: "A1" },
  { word: "research", phonetic: "/research/", meaning: "研究", example: "Scientific research.", level: "A1" },
  { word: "resource", phonetic: "/resource/", meaning: "资源", example: "Natural resources.", level: "A1" },
  { word: "respect", phonetic: "/respect/", meaning: "尊重", example: "Respect your elders.", level: "A1" },
  { word: "rest", phonetic: "/rest/", meaning: "休息", example: "Take a rest.", level: "A1" },
  { word: "restaurant", phonetic: "/restaurant/", meaning: "餐厅", example: "A nice restaurant.", level: "A1" },
  { word: "result", phonetic: "/result/", meaning: "结果", example: "A good result.", level: "A1" },
  { word: "return", phonetic: "/return/", meaning: "返回", example: "Return home.", level: "A1" },
  { word: "reveal", phonetic: "/reveal/", meaning: "揭示", example: "Reveal the truth.", level: "A1" },
  { word: "review", phonetic: "/review/", meaning: "复习", example: "Review your notes.", level: "A1" },
  { word: "rich", phonetic: "/rich/", meaning: "富有的", example: "A rich person.", level: "A1" },
  { word: "ride", phonetic: "/ride/", meaning: "骑", example: "Ride a bicycle.", level: "A1" },
  { word: "right", phonetic: "/right/", meaning: "正确的", example: "You are right.", level: "A1" },
  { word: "ring", phonetic: "/ring/", meaning: "戒指", example: "A gold ring.", level: "A1" },
  { word: "rise", phonetic: "/rise/", meaning: "上升", example: "The sun rises.", level: "A1" },
  { word: "river", phonetic: "/river/", meaning: "河", example: "A long river.", level: "A1" },
  { word: "road", phonetic: "/road/", meaning: "路", example: "A main road.", level: "A1" },
  { word: "rock", phonetic: "/rock/", meaning: "岩石", example: "A big rock.", level: "A1" },
  { word: "role", phonetic: "/role/", meaning: "角色", example: "Play a role.", level: "A1" },
  { word: "room", phonetic: "/room/", meaning: "房间", example: "A clean room.", level: "A1" },
  { word: "root", phonetic: "/root/", meaning: "根", example: "A tree root.", level: "A1" },
  { word: "rope", phonetic: "/rope/", meaning: "绳子", example: "A strong rope.", level: "A1" },
  { word: "rose", phonetic: "/rose/", meaning: "玫瑰", example: "A red rose.", level: "A1" },
  { word: "round", phonetic: "/round/", meaning: "圆的", example: "A round table.", level: "A1" },
  { word: "row", phonetic: "/row/", meaning: "排", example: "A row of seats.", level: "A1" },
  { word: "rule", phonetic: "/rule/", meaning: "规则", example: "Follow the rules.", level: "A1" },
  { word: "run", phonetic: "/run/", meaning: "跑", example: "Run fast.", level: "A1" },
  { word: "rush", phonetic: "/rush/", meaning: "冲", example: "Do not rush.", level: "A1" },
  { word: "sad", phonetic: "/sad/", meaning: "悲伤的", example: "I am sad.", level: "A1" },
  { word: "safe", phonetic: "/safe/", meaning: "安全的", example: "A safe place.", level: "A1" },
  { word: "sail", phonetic: "/sail/", meaning: "航行", example: "Sail across the sea.", level: "A1" },
  { word: "salt", phonetic: "/salt/", meaning: "盐", example: "Add some salt.", level: "A1" },
  { word: "same", phonetic: "/same/", meaning: "相同的", example: "The same thing.", level: "A1" },
  { word: "sand", phonetic: "/sand/", meaning: "沙子", example: "Play in the sand.", level: "A1" },
  { word: "satisfy", phonetic: "/satisfy/", meaning: "满足", example: "Satisfy your needs.", level: "A1" },
  { word: "save", phonetic: "/save/", meaning: "拯救", example: "Save the planet.", level: "A1" },
  { word: "say", phonetic: "/say/", meaning: "说", example: "What did you say?", level: "A1" },
  { word: "scene", phonetic: "/scene/", meaning: "场景", example: "A beautiful scene.", level: "A1" },
  { word: "school", phonetic: "/school/", meaning: "学校", example: "Go to school.", level: "A1" },
  { word: "science", phonetic: "/science/", meaning: "科学", example: "Study science.", level: "A1" },
  { word: "sea", phonetic: "/sea/", meaning: "大海", example: "The blue sea.", level: "A1" },
  { word: "search", phonetic: "/search/", meaning: "搜索", example: "Search for it.", level: "A1" },
  { word: "season", phonetic: "/season/", meaning: "季节", example: "Four seasons.", level: "A1" },
  { word: "seat", phonetic: "/seat/", meaning: "座位", example: "Take a seat.", level: "A1" },
  { word: "second", phonetic: "/second/", meaning: "第二", example: "The second one.", level: "A1" },
  { word: "secret", phonetic: "/secret/", meaning: "秘密", example: "Keep a secret.", level: "A1" },
  { word: "section", phonetic: "/section/", meaning: "部分", example: "The first section.", level: "A1" },
  { word: "see", phonetic: "/see/", meaning: "看见", example: "I can see you.", level: "A1" },
  { word: "seed", phonetic: "/seed/", meaning: "种子", example: "Plant a seed.", level: "A1" },
  { word: "seem", phonetic: "/seem/", meaning: "似乎", example: "It seems right.", level: "A1" },
  { word: "sell", phonetic: "/sell/", meaning: "卖", example: "Sell the car.", level: "A1" },
  { word: "send", phonetic: "/send/", meaning: "发送", example: "Send a message.", level: "A1" },
  { word: "senior", phonetic: "/senior/", meaning: "高级的", example: "A senior officer.", level: "A1" },
  { word: "sense", phonetic: "/sense/", meaning: "感觉", example: "A common sense.", level: "A1" },
  { word: "sentence", phonetic: "/sentence/", meaning: "句子", example: "A long sentence.", level: "A1" },
  { word: "separate", phonetic: "/separate/", meaning: "分开", example: "Separate the colors.", level: "A1" },
  { word: "serious", phonetic: "/serious/", meaning: "严肃的", example: "A serious matter.", level: "A1" },
  { word: "serve", phonetic: "/serve/", meaning: "服务", example: "Serve the people.", level: "A1" },
  { word: "service", phonetic: "/service/", meaning: "服务", example: "Customer service.", level: "A1" },
  { word: "set", phonetic: "/set/", meaning: "设置", example: "Set the alarm.", level: "A1" },
  { word: "several", phonetic: "/several/", meaning: "几个", example: "Several days.", level: "A1" },
  { word: "shake", phonetic: "/shake/", meaning: "摇", example: "Shake hands.", level: "A1" },
  { word: "shall", phonetic: "/shall/", meaning: "应该", example: "Shall we go?", level: "A1" },
  { word: "shape", phonetic: "/shape/", meaning: "形状", example: "A round shape.", level: "A1" },
  { word: "share", phonetic: "/share/", meaning: "分享", example: "Share your food.", level: "A1" },
  { word: "sharp", phonetic: "/sharp/", meaning: "锋利的", example: "A sharp knife.", level: "A1" },
  { word: "she", phonetic: "/she/", meaning: "她", example: "She is kind.", level: "A1" },
  { word: "sheep", phonetic: "/sheep/", meaning: "羊", example: "A white sheep.", level: "A1" },
  { word: "sheet", phonetic: "/sheet/", meaning: "一张", example: "A sheet of paper.", level: "A1" },
  { word: "shine", phonetic: "/shine/", meaning: "发光", example: "The sun shines.", level: "A1" },
  { word: "ship", phonetic: "/ship/", meaning: "船", example: "A large ship.", level: "A1" },
  { word: "shirt", phonetic: "/shirt/", meaning: "衬衫", example: "A white shirt.", level: "A1" },
  { word: "shock", phonetic: "/shock/", meaning: "震惊", example: "A big shock.", level: "A1" },
  { word: "shoe", phonetic: "/shoe/", meaning: "鞋", example: "A pair of shoes.", level: "A1" },
  { word: "shoot", phonetic: "/shoot/", meaning: "射击", example: "Shoot the ball.", level: "A1" },
  { word: "shop", phonetic: "/shop/", meaning: "商店", example: "Go shopping.", level: "A1" },
  { word: "short", phonetic: "/short/", meaning: "短的", example: "A short story.", level: "A1" },
  { word: "should", phonetic: "/should/", meaning: "应该", example: "You should go.", level: "A1" },
  { word: "shoulder", phonetic: "/shoulder/", meaning: "肩膀", example: "Tap on the shoulder.", level: "A1" },
  { word: "shout", phonetic: "/shout/", meaning: "喊", example: "Do not shout.", level: "A1" },
  { word: "show", phonetic: "/show/", meaning: "展示", example: "Show me your work.", level: "A1" },
  { word: "shut", phonetic: "/shut/", meaning: "关闭", example: "Shut the door.", level: "A1" },
  { word: "shy", phonetic: "/shy/", meaning: "害羞的", example: "A shy child.", level: "A1" },
  { word: "sick", phonetic: "/sick/", meaning: "生病的", example: "I feel sick.", level: "A1" },
  { word: "side", phonetic: "/side/", meaning: "旁边", example: "On the other side.", level: "A1" },
  { word: "sight", phonetic: "/sight/", meaning: "景象", example: "A beautiful sight.", level: "A1" },
  { word: "sign", phonetic: "/sign/", meaning: "标志", example: "A road sign.", level: "A1" },
  { word: "silence", phonetic: "/silence/", meaning: "沉默", example: "Complete silence.", level: "A1" },
  { word: "silly", phonetic: "/silly/", meaning: "傻的", example: "A silly mistake.", level: "A1" },
  { word: "silver", phonetic: "/silver/", meaning: "银", example: "A silver coin.", level: "A1" },
  { word: "similar", phonetic: "/similar/", meaning: "相似的", example: "Very similar.", level: "A1" },
  { word: "simple", phonetic: "/simple/", meaning: "简单的", example: "A simple task.", level: "A1" },
  { word: "since", phonetic: "/since/", meaning: "自从", example: "Since yesterday.", level: "A1" },
  { word: "sing", phonetic: "/sing/", meaning: "唱", example: "Sing a song.", level: "A1" },
  { word: "single", phonetic: "/single/", meaning: "单一的", example: "A single person.", level: "A1" },
  { word: "sir", phonetic: "/sir/", meaning: "先生", example: "Yes, sir.", level: "A1" },
  { word: "sister", phonetic: "/sister/", meaning: "姐妹", example: "My sister is smart.", level: "A1" },
  { word: "sit", phonetic: "/sit/", meaning: "坐", example: "Sit down.", level: "A1" },
  { word: "situation", phonetic: "/situation/", meaning: "情况", example: "A difficult situation.", level: "A1" },
  { word: "size", phonetic: "/size/", meaning: "大小", example: "What size?", level: "A1" },
  { word: "skill", phonetic: "/skill/", meaning: "技能", example: "A useful skill.", level: "A1" },
  { word: "skin", phonetic: "/skin/", meaning: "皮肤", example: "Soft skin.", level: "A1" },
  { word: "sky", phonetic: "/sky/", meaning: "天空", example: "A blue sky.", level: "A1" },
  { word: "sleep", phonetic: "/sleep/", meaning: "睡觉", example: "Go to sleep.", level: "A1" },
  { word: "slow", phonetic: "/slow/", meaning: "慢的", example: "A slow walk.", level: "A1" },
  { word: "slowly", phonetic: "/slowly/", meaning: "慢慢地", example: "Walk slowly.", level: "A1" },
  { word: "small", phonetic: "/small/", meaning: "小的", example: "A small cat.", level: "A1" },
  { word: "smart", phonetic: "/smart/", meaning: "聪明的", example: "A smart student.", level: "A1" },
  { word: "smell", phonetic: "/smell/", meaning: "闻", example: "Smell the flower.", level: "A1" },
  { word: "smile", phonetic: "/smile/", meaning: "微笑", example: "Smile at me.", level: "A1" },
  { word: "smoke", phonetic: "/smoke/", meaning: "烟", example: "No smoking.", level: "A1" },
  { word: "snow", phonetic: "/snow/", meaning: "雪", example: "White snow.", level: "A1" },
  { word: "so", phonetic: "/so/", meaning: "所以", example: "So what?", level: "A1" },
  { word: "soft", phonetic: "/soft/", meaning: "软的", example: "A soft pillow.", level: "A1" },
  { word: "soldier", phonetic: "/soldier/", meaning: "士兵", example: "A brave soldier.", level: "A1" },
  { word: "solve", phonetic: "/solve/", meaning: "解决", example: "Solve the problem.", level: "A1" },
  { word: "some", phonetic: "/some/", meaning: "一些", example: "Some people.", level: "A1" },
  { word: "somebody", phonetic: "/somebody/", meaning: "某人", example: "Somebody called.", level: "A1" },
  { word: "someone", phonetic: "/someone/", meaning: "某人", example: "Someone is here.", level: "A1" },
  { word: "something", phonetic: "/something/", meaning: "某事", example: "Something happened.", level: "A1" },
  { word: "sometimes", phonetic: "/sometimes/", meaning: "有时", example: "Sometimes I read.", level: "A1" },
  { word: "son", phonetic: "/son/", meaning: "儿子", example: "My son is smart.", level: "A1" },
  { word: "song", phonetic: "/song/", meaning: "歌", example: "A beautiful song.", level: "A1" },
  { word: "soon", phonetic: "/soon/", meaning: "很快", example: "See you soon.", level: "A1" },
  { word: "sort", phonetic: "/sort/", meaning: "种类", example: "A different sort.", level: "A1" },
  { word: "soul", phonetic: "/soul/", meaning: "灵魂", example: "A kind soul.", level: "A1" },
  { word: "sound", phonetic: "/sound/", meaning: "声音", example: "A loud sound.", level: "A1" },
  { word: "soup", phonetic: "/soup/", meaning: "汤", example: "A bowl of soup.", level: "A1" },
  { word: "south", phonetic: "/south/", meaning: "南方", example: "Go south.", level: "A1" },
  { word: "space", phonetic: "/space/", meaning: "空间", example: "Outer space.", level: "A1" },
  { word: "speak", phonetic: "/speak/", meaning: "说话", example: "Speak clearly.", level: "A1" },
  { word: "special", phonetic: "/special/", meaning: "特别的", example: "A special day.", level: "A1" },
  { word: "speech", phonetic: "/speech/", meaning: "演讲", example: "Give a speech.", level: "A1" },
  { word: "speed", phonetic: "/speed/", meaning: "速度", example: "High speed.", level: "A1" },
  { word: "spend", phonetic: "/spend/", meaning: "花费", example: "Spend time.", level: "A1" },
  { word: "spirit", phonetic: "/spirit/", meaning: "精神", example: "Team spirit.", level: "A1" },
  { word: "spoon", phonetic: "/spoon/", meaning: "勺子", example: "A wooden spoon.", level: "A1" },
  { word: "sport", phonetic: "/sport/", meaning: "运动", example: "A popular sport.", level: "A1" },
  { word: "spread", phonetic: "/spread/", meaning: "传播", example: "Spread the word.", level: "A1" },
  { word: "spring", phonetic: "/spring/", meaning: "春天", example: "In spring.", level: "A1" },
  { word: "square", phonetic: "/square/", meaning: "正方形", example: "A square box.", level: "A1" },
  { word: "stage", phonetic: "/stage/", meaning: "舞台", example: "On the stage.", level: "A1" },
  { word: "stand", phonetic: "/stand/", meaning: "站", example: "Stand up.", level: "A1" },
  { word: "standard", phonetic: "/standard/", meaning: "标准", example: "A high standard.", level: "A1" },
  { word: "star", phonetic: "/star/", meaning: "星星", example: "A bright star.", level: "A1" },
  { word: "start", phonetic: "/start/", meaning: "开始", example: "Start now.", level: "A1" },
  { word: "state", phonetic: "/state/", meaning: "状态", example: "A good state.", level: "A1" },
  { word: "station", phonetic: "/station/", meaning: "车站", example: "A train station.", level: "A1" },
  { word: "stay", phonetic: "/stay/", meaning: "停留", example: "Stay here.", level: "A1" },
  { word: "steal", phonetic: "/steal/", meaning: "偷", example: "Do not steal.", level: "A1" },
  { word: "steam", phonetic: "/steam/", meaning: "蒸汽", example: "Hot steam.", level: "A1" },
  { word: "steel", phonetic: "/steel/", meaning: "钢铁", example: "Strong steel.", level: "A1" },
  { word: "step", phonetic: "/step/", meaning: "步骤", example: "A first step.", level: "A1" },
  { word: "stick", phonetic: "/stick/", meaning: "粘", example: "Stick it here.", level: "A1" },
  { word: "still", phonetic: "/still/", meaning: "仍然", example: "I am still here.", level: "A1" },
  { word: "stomach", phonetic: "/stomach/", meaning: "胃", example: "My stomach hurts.", level: "A1" },
  { word: "stone", phonetic: "/stone/", meaning: "石头", example: "A heavy stone.", level: "A1" },
  { word: "stop", phonetic: "/stop/", meaning: "停止", example: "Stop the car.", level: "A1" },
  { word: "store", phonetic: "/store/", meaning: "商店", example: "A big store.", level: "A1" },
  { word: "storm", phonetic: "/storm/", meaning: "暴风雨", example: "A big storm.", level: "A1" },
  { word: "story", phonetic: "/story/", meaning: "故事", example: "Tell a story.", level: "A1" },
  { word: "strange", phonetic: "/strange/", meaning: "奇怪的", example: "A strange noise.", level: "A1" },
  { word: "stranger", phonetic: "/stranger/", meaning: "陌生人", example: "A friendly stranger.", level: "A1" },
  { word: "street", phonetic: "/street/", meaning: "街", example: "A main street.", level: "A1" },
  { word: "strength", phonetic: "/strength/", meaning: "力量", example: "Inner strength.", level: "A1" },
  { word: "strict", phonetic: "/strict/", meaning: "严格的", example: "A strict teacher.", level: "A1" },
  { word: "strike", phonetic: "/strike/", meaning: "打击", example: "Strike the ball.", level: "A1" },
  { word: "strong", phonetic: "/strong/", meaning: "强壮的", example: "A strong man.", level: "A1" },
  { word: "structure", phonetic: "/structure/", meaning: "结构", example: "A simple structure.", level: "A1" },
  { word: "student", phonetic: "/student/", meaning: "学生", example: "A good student.", level: "A1" },
  { word: "study", phonetic: "/study/", meaning: "学习", example: "Study hard.", level: "A1" },
  { word: "stupid", phonetic: "/stupid/", meaning: "愚蠢的", example: "A stupid mistake.", level: "A1" },
  { word: "subject", phonetic: "/subject/", meaning: "科目", example: "A favorite subject.", level: "A1" },
  { word: "success", phonetic: "/success/", meaning: "成功", example: "Hard work brings success.", level: "A1" },
  { word: "such", phonetic: "/such/", meaning: "这样的", example: "Such a good day.", level: "A1" },
  { word: "suddenly", phonetic: "/suddenly/", meaning: "突然", example: "Suddenly, it rained.", level: "A1" },
  { word: "suffer", phonetic: "/suffer/", meaning: "遭受", example: "Suffer from illness.", level: "A1" },
  { word: "sugar", phonetic: "/sugar/", meaning: "糖", example: "Too much sugar.", level: "A1" },
  { word: "suggest", phonetic: "/suggest/", meaning: "建议", example: "I suggest going.", level: "A1" },
  { word: "suit", phonetic: "/suit/", meaning: "适合", example: "This suits me.", level: "A1" },
  { word: "summer", phonetic: "/summer/", meaning: "夏天", example: "A hot summer.", level: "A1" },
  { word: "sun", phonetic: "/sun/", meaning: "太阳", example: "The sun is bright.", level: "A1" },
  { word: "supper", phonetic: "/supper/", meaning: "晚餐", example: "Have supper.", level: "A1" },
  { word: "supply", phonetic: "/supply/", meaning: "供应", example: "A good supply.", level: "A1" },
  { word: "support", phonetic: "/support/", meaning: "支持", example: "Support your team.", level: "A1" },
  { word: "suppose", phonetic: "/suppose/", meaning: "假设", example: "I suppose so.", level: "A1" },
  { word: "sure", phonetic: "/sure/", meaning: "确定的", example: "I am sure.", level: "A1" },
  { word: "surprise", phonetic: "/surprise/", meaning: "惊喜", example: "A big surprise.", level: "A1" },
  { word: "sweet", phonetic: "/sweet/", meaning: "甜的", example: "Sweet candy.", level: "A1" },
  { word: "swim", phonetic: "/swim/", meaning: "游泳", example: "I can swim.", level: "A1" },
  { word: "table", phonetic: "/table/", meaning: "桌子", example: "A wooden table.", level: "A1" },
  { word: "tail", phonetic: "/tail/", meaning: "尾巴", example: "A long tail.", level: "A1" },
  { word: "take", phonetic: "/take/", meaning: "拿", example: "Take this.", level: "A1" },
  { word: "talk", phonetic: "/talk/", meaning: "说话", example: "Let us talk.", level: "A1" },
  { word: "tall", phonetic: "/tall/", meaning: "高的", example: "A tall building.", level: "A1" },
  { word: "taste", phonetic: "/taste/", meaning: "味道", example: "A good taste.", level: "A1" },
  { word: "taxi", phonetic: "/taxi/", meaning: "出租车", example: "Take a taxi.", level: "A1" },
  { word: "tea", phonetic: "/tea/", meaning: "茶", example: "A cup of tea.", level: "A1" },
  { word: "teach", phonetic: "/teach/", meaning: "教", example: "Teach me.", level: "A1" },
  { word: "teacher", phonetic: "/teacher/", meaning: "老师", example: "A good teacher.", level: "A1" },
  { word: "team", phonetic: "/team/", meaning: "团队", example: "A strong team.", level: "A1" },
  { word: "technology", phonetic: "/technology/", meaning: "技术", example: "Modern technology.", level: "A1" },
  { word: "tell", phonetic: "/tell/", meaning: "告诉", example: "Tell me a story.", level: "A1" },
  { word: "temperature", phonetic: "/temperature/", meaning: "温度", example: "High temperature.", level: "A1" },
  { word: "ten", phonetic: "/ten/", meaning: "十", example: "Ten people.", level: "A1" },
  { word: "tend", phonetic: "/tend/", meaning: "倾向", example: "I tend to agree.", level: "A1" },
  { word: "term", phonetic: "/term/", meaning: "学期", example: "This term.", level: "A1" },
  { word: "terrible", phonetic: "/terrible/", meaning: "可怕的", example: "A terrible storm.", level: "A1" },
  { word: "test", phonetic: "/test/", meaning: "测试", example: "Pass the test.", level: "A1" },
  { word: "text", phonetic: "/text/", meaning: "课文", example: "Read the text.", level: "A1" },
  { word: "than", phonetic: "/than/", meaning: "比", example: "Better than before.", level: "A1" },
  { word: "thank", phonetic: "/thank/", meaning: "感谢", example: "Thank you.", level: "A1" },
  { word: "that", phonetic: "/that/", meaning: "那个", example: "That is right.", level: "A1" },
  { word: "the", phonetic: "/the/", meaning: "这", example: "The book is here.", level: "A1" },
  { word: "theater", phonetic: "/theater/", meaning: "剧院", example: "Go to the theater.", level: "A1" },
  { word: "their", phonetic: "/their/", meaning: "他们的", example: "Their house.", level: "A1" },
  { word: "them", phonetic: "/them/", meaning: "他们", example: "Give it to them.", level: "A1" },
  { word: "then", phonetic: "/then/", meaning: "然后", example: "What then?", level: "A1" },
  { word: "there", phonetic: "/there/", meaning: "那里", example: "Over there.", level: "A1" },
  { word: "these", phonetic: "/these/", meaning: "这些", example: "These are mine.", level: "A1" },
  { word: "they", phonetic: "/they/", meaning: "他们", example: "They are kind.", level: "A1" },
  { word: "thick", phonetic: "/thick/", meaning: "厚的", example: "A thick book.", level: "A1" },
  { word: "thin", phonetic: "/thin/", meaning: "薄的", example: "A thin paper.", level: "A1" },
  { word: "thing", phonetic: "/thing/", meaning: "东西", example: "A useful thing.", level: "A1" },
  { word: "think", phonetic: "/think/", meaning: "想", example: "I think so.", level: "A1" },
  { word: "third", phonetic: "/third/", meaning: "第三", example: "The third one.", level: "A1" },
  { word: "this", phonetic: "/this/", meaning: "这个", example: "This is it.", level: "A1" },
  { word: "those", phonetic: "/those/", meaning: "那些", example: "Those are yours.", level: "A1" },
  { word: "though", phonetic: "/though/", meaning: "虽然", example: "Though it is hard.", level: "A1" },
  { word: "thought", phonetic: "/thought/", meaning: "想法", example: "A good thought.", level: "A1" },
  { word: "thousand", phonetic: "/thousand/", meaning: "千", example: "A thousand people.", level: "A1" },
  { word: "threat", phonetic: "/threat/", meaning: "威胁", example: "A real threat.", level: "A1" },
  { word: "throat", phonetic: "/throat/", meaning: "喉咙", example: "My throat hurts.", level: "A1" },
  { word: "through", phonetic: "/through/", meaning: "穿过", example: "Walk through the door.", level: "A1" },
  { word: "throw", phonetic: "/throw/", meaning: "扔", example: "Throw the ball.", level: "A1" },
  { word: "thus", phonetic: "/thus/", meaning: "因此", example: "Thus, we succeed.", level: "A1" },
  { word: "ticket", phonetic: "/ticket/", meaning: "票", example: "A bus ticket.", level: "A1" },
  { word: "tidy", phonetic: "/tidy/", meaning: "整洁的", example: "A tidy room.", level: "A1" },
  { word: "tie", phonetic: "/tie/", meaning: "领带", example: "A red tie.", level: "A1" },
  { word: "tight", phonetic: "/tight/", meaning: "紧的", example: "A tight rope.", level: "A1" },
  { word: "till", phonetic: "/till/", meaning: "直到", example: "Wait till tomorrow.", level: "A1" },
  { word: "time", phonetic: "/time/", meaning: "时间", example: "What time is it?", level: "A1" },
  { word: "tiny", phonetic: "/tiny/", meaning: "微小的", example: "A tiny bug.", level: "A1" },
  { word: "tired", phonetic: "/tired/", meaning: "累的", example: "I am tired.", level: "A1" },
  { word: "title", phonetic: "/title/", meaning: "标题", example: "A good title.", level: "A1" },
  { word: "today", phonetic: "/today/", meaning: "今天", example: "Today is Monday.", level: "A1" },
  { word: "together", phonetic: "/together/", meaning: "一起", example: "Work together.", level: "A1" },
  { word: "tomorrow", phonetic: "/tomorrow/", meaning: "明天", example: "See you tomorrow.", level: "A1" },
  { word: "tongue", phonetic: "/tongue/", meaning: "舌头", example: "Stick out your tongue.", level: "A1" },
  { word: "tonight", phonetic: "/tonight/", meaning: "今晚", example: "Tonight is special.", level: "A1" },
  { word: "too", phonetic: "/too/", meaning: "也", example: "Me too.", level: "A1" },
  { word: "tool", phonetic: "/tool/", meaning: "工具", example: "A useful tool.", level: "A1" },
  { word: "tooth", phonetic: "/tooth/", meaning: "牙齿", example: "Brush your teeth.", level: "A1" },
  { word: "top", phonetic: "/top/", meaning: "顶部", example: "On top of.", level: "A1" },
  { word: "total", phonetic: "/total/", meaning: "总共", example: "A total of ten.", level: "A1" },
  { word: "touch", phonetic: "/touch/", meaning: "触摸", example: "Do not touch.", level: "A1" },
  { word: "tough", phonetic: "/tough/", meaning: "困难的", example: "A tough job.", level: "A1" },
  { word: "tour", phonetic: "/tour/", meaning: "旅行", example: "A city tour.", level: "A1" },
  { word: "toward", phonetic: "/toward/", meaning: "朝向", example: "Walk toward me.", level: "A1" },
  { word: "tower", phonetic: "/tower/", meaning: "塔", example: "A tall tower.", level: "A1" },
  { word: "town", phonetic: "/town/", meaning: "镇", example: "A small town.", level: "A1" },
  { word: "toy", phonetic: "/toy/", meaning: "玩具", example: "A child's toy.", level: "A1" },
  { word: "track", phonetic: "/track/", meaning: "轨道", example: "A train track.", level: "A1" },
  { word: "trade", phonetic: "/trade/", meaning: "贸易", example: "International trade.", level: "A1" },
  { word: "tradition", phonetic: "/tradition/", meaning: "传统", example: "An old tradition.", level: "A1" },
  { word: "traffic", phonetic: "/traffic/", meaning: "交通", example: "Heavy traffic.", level: "A1" },
  { word: "train", phonetic: "/train/", meaning: "火车", example: "Take the train.", level: "A1" },
  { word: "training", phonetic: "/training/", meaning: "训练", example: "Military training.", level: "A1" },
  { word: "transfer", phonetic: "/transfer/", meaning: "转移", example: "Transfer the data.", level: "A1" },
  { word: "travel", phonetic: "/travel/", meaning: "旅行", example: "Travel the world.", level: "A1" },
  { word: "treasure", phonetic: "/treasure/", meaning: "宝藏", example: "Hidden treasure.", level: "A1" },
  { word: "treat", phonetic: "/treat/", meaning: "对待", example: "Treat others well.", level: "A1" },
  { word: "tree", phonetic: "/tree/", meaning: "树", example: "A tall tree.", level: "A1" },
  { word: "trip", phonetic: "/trip/", meaning: "旅行", example: "A business trip.", level: "A1" },
  { word: "trouble", phonetic: "/trouble/", meaning: "麻烦", example: "A lot of trouble.", level: "A1" },
  { word: "truck", phonetic: "/truck/", meaning: "卡车", example: "A big truck.", level: "A1" },
  { word: "true", phonetic: "/true/", meaning: "真的", example: "Is it true?", level: "A1" },
  { word: "trust", phonetic: "/trust/", meaning: "信任", example: "Trust me.", level: "A1" },
  { word: "truth", phonetic: "/truth/", meaning: "真相", example: "Tell the truth.", level: "A1" },
  { word: "try", phonetic: "/try/", meaning: "尝试", example: "Try your best.", level: "A1" },
  { word: "turn", phonetic: "/turn/", meaning: "转", example: "Turn left.", level: "A1" },
  { word: "twice", phonetic: "/twice/", meaning: "两次", example: "Twice a week.", level: "A1" },
  { word: "type", phonetic: "/type/", meaning: "类型", example: "A new type.", level: "A1" },
  { word: "ugly", phonetic: "/ugly/", meaning: "丑的", example: "An ugly building.", level: "A1" },
  { word: "uncle", phonetic: "/uncle/", meaning: "叔叔", example: "My uncle is kind.", level: "A1" },
  { word: "under", phonetic: "/under/", meaning: "在…下面", example: "Under the table.", level: "A1" },
  { word: "understand", phonetic: "/understand/", meaning: "理解", example: "I understand.", level: "A1" },
  { word: "university", phonetic: "/university/", meaning: "大学", example: "Go to university.", level: "A1" },
  { word: "unless", phonetic: "/unless/", meaning: "除非", example: "Unless you hurry.", level: "A1" },
  { word: "until", phonetic: "/until/", meaning: "直到", example: "Until tomorrow.", level: "A1" },
  { word: "up", phonetic: "/up/", meaning: "向上", example: "Look up.", level: "A1" },
  { word: "upon", phonetic: "/upon/", meaning: "在…上", example: "Once upon a time.", level: "A1" },
  { word: "use", phonetic: "/use/", meaning: "使用", example: "Use your brain.", level: "A1" },
  { word: "used", phonetic: "/used/", meaning: "用过的", example: "A used car.", level: "A1" },
  { word: "useful", phonetic: "/useful/", meaning: "有用的", example: "A useful tool.", level: "A1" },
  { word: "usual", phonetic: "/usual/", meaning: "通常的", example: "The usual time.", level: "A1" },
  { word: "usually", phonetic: "/usually/", meaning: "通常", example: "I usually read.", level: "A1" },
  { word: "value", phonetic: "/value/", meaning: "价值", example: "A great value.", level: "A1" },
  { word: "variety", phonetic: "/variety/", meaning: "种类", example: "A variety of choices.", level: "A1" },
  { word: "very", phonetic: "/very/", meaning: "非常", example: "Very good.", level: "A1" },
  { word: "victory", phonetic: "/victory/", meaning: "胜利", example: "A great victory.", level: "A1" },
  { word: "village", phonetic: "/village/", meaning: "村庄", example: "A small village.", level: "A1" },
  { word: "visit", phonetic: "/visit/", meaning: "拜访", example: "Visit a friend.", level: "A1" },
  { word: "voice", phonetic: "/voice/", meaning: "声音", example: "A soft voice.", level: "A1" },
  { word: "wait", phonetic: "/wait/", meaning: "等待", example: "Wait for me.", level: "A1" },
  { word: "wake", phonetic: "/wake/", meaning: "醒来", example: "Wake up early.", level: "A1" },
  { word: "walk", phonetic: "/walk/", meaning: "走路", example: "Walk slowly.", level: "A1" },
  { word: "wall", phonetic: "/wall/", meaning: "墙", example: "A brick wall.", level: "A1" },
  { word: "want", phonetic: "/want/", meaning: "想要", example: "I want it.", level: "A1" },
  { word: "war", phonetic: "/war/", meaning: "战争", example: "A long war.", level: "A1" },
  { word: "warm", phonetic: "/warm/", meaning: "温暖的", example: "A warm day.", level: "A1" },
  { word: "warn", phonetic: "/warn/", meaning: "警告", example: "Warn the people.", level: "A1" },
  { word: "wash", phonetic: "/wash/", meaning: "洗", example: "Wash your hands.", level: "A1" },
  { word: "waste", phonetic: "/waste/", meaning: "浪费", example: "Do not waste.", level: "A1" },
  { word: "watch", phonetic: "/watch/", meaning: "手表", example: "A gold watch.", level: "A1" },
  { word: "water", phonetic: "/water/", meaning: "水", example: "Drink water.", level: "A1" },
  { word: "wave", phonetic: "/wave/", meaning: "波浪", example: "A big wave.", level: "A1" },
  { word: "way", phonetic: "/way/", meaning: "路", example: "On the way.", level: "A1" },
  { word: "we", phonetic: "/we/", meaning: "我们", example: "We are friends.", level: "A1" },
  { word: "weak", phonetic: "/weak/", meaning: "虚弱的", example: "A weak person.", level: "A1" },
  { word: "wealth", phonetic: "/wealth/", meaning: "财富", example: "Health is wealth.", level: "A1" },
  { word: "weapon", phonetic: "/weapon/", meaning: "武器", example: "A dangerous weapon.", level: "A1" },
  { word: "wear", phonetic: "/wear/", meaning: "穿", example: "Wear a coat.", level: "A1" },
  { word: "weather", phonetic: "/weather/", meaning: "天气", example: "The weather is nice.", level: "A1" },
  { word: "website", phonetic: "/website/", meaning: "网站", example: "A useful website.", level: "A1" },
  { word: "wedding", phonetic: "/wedding/", meaning: "婚礼", example: "A beautiful wedding.", level: "A1" },
  { word: "week", phonetic: "/week/", meaning: "周", example: "This week.", level: "A1" },
  { word: "weekend", phonetic: "/weekend/", meaning: "周末", example: "This weekend.", level: "A1" },
  { word: "weigh", phonetic: "/weigh/", meaning: "称重", example: "Weigh the bag.", level: "A1" },
  { word: "weight", phonetic: "/weight/", meaning: "重量", example: "Lose weight.", level: "A1" },
  { word: "welcome", phonetic: "/welcome/", meaning: "欢迎", example: "Welcome home.", level: "A1" },
  { word: "well", phonetic: "/well/", meaning: "好", example: "I am well.", level: "A1" },
  { word: "west", phonetic: "/west/", meaning: "西方", example: "Go west.", level: "A1" },
  { word: "western", phonetic: "/western/", meaning: "西方的", example: "Western culture.", level: "A1" },
  { word: "wet", phonetic: "/wet/", meaning: "湿的", example: "Wet clothes.", level: "A1" },
  { word: "what", phonetic: "/what/", meaning: "什么", example: "What is this?", level: "A1" },
  { word: "whatever", phonetic: "/whatever/", meaning: "无论什么", example: "Whatever you say.", level: "A1" },
  { word: "when", phonetic: "/when/", meaning: "当…时候", example: "When I was young.", level: "A1" },
  { word: "where", phonetic: "/where/", meaning: "哪里", example: "Where is it?", level: "A1" },
  { word: "whether", phonetic: "/whether/", meaning: "是否", example: "I wonder whether.", level: "A1" },
  { word: "which", phonetic: "/which/", meaning: "哪个", example: "Which one?", level: "A1" },
  { word: "while", phonetic: "/while/", meaning: "当…时候", example: "While I was sleeping.", level: "A1" },
  { word: "white", phonetic: "/white/", meaning: "白色", example: "A white shirt.", level: "A1" },
  { word: "who", phonetic: "/who/", meaning: "谁", example: "Who is there?", level: "A1" },
  { word: "whole", phonetic: "/whole/", meaning: "整个", example: "The whole day.", level: "A1" },
  { word: "whom", phonetic: "/whom/", meaning: "谁", example: "To whom?", level: "A1" },
  { word: "whose", phonetic: "/whose/", meaning: "谁的", example: "Whose book is this?", level: "A1" },
  { word: "why", phonetic: "/why/", meaning: "为什么", example: "Why not?", level: "A1" },
  { word: "wide", phonetic: "/wide/", meaning: "宽的", example: "A wide road.", level: "A1" },
  { word: "wife", phonetic: "/wife/", meaning: "妻子", example: "His wife is kind.", level: "A1" },
  { word: "wild", phonetic: "/wild/", meaning: "野生的", example: "Wild animals.", level: "A1" },
  { word: "will", phonetic: "/will/", meaning: "将", example: "I will go.", level: "A1" },
  { word: "win", phonetic: "/win/", meaning: "赢", example: "Win the game.", level: "A1" },
  { word: "wind", phonetic: "/wind/", meaning: "风", example: "Strong wind.", level: "A1" },
  { word: "window", phonetic: "/window/", meaning: "窗户", example: "Open the window.", level: "A1" },
  { word: "wine", phonetic: "/wine/", meaning: "红酒", example: "A glass of wine.", level: "A1" },
  { word: "wing", phonetic: "/wing/", meaning: "翅膀", example: "A bird's wing.", level: "A1" },
  { word: "winter", phonetic: "/winter/", meaning: "冬天", example: "A cold winter.", level: "A1" },
  { word: "wise", phonetic: "/wise/", meaning: "明智的", example: "A wise decision.", level: "A1" },
  { word: "wish", phonetic: "/wish/", meaning: "希望", example: "I wish you well.", level: "A1" },
  { word: "with", phonetic: "/with/", meaning: "和", example: "Come with me.", level: "A1" },
  { word: "within", phonetic: "/within/", meaning: "在…之内", example: "Within a week.", level: "A1" },
  { word: "without", phonetic: "/without/", meaning: "没有", example: "Without doubt.", level: "A1" },
  { word: "woman", phonetic: "/woman/", meaning: "女人", example: "A smart woman.", level: "A1" },
  { word: "wonder", phonetic: "/wonder/", meaning: "想知道", example: "I wonder why.", level: "A1" },
  { word: "wonderful", phonetic: "/wonderful/", meaning: "精彩的", example: "A wonderful day.", level: "A1" },
  { word: "wood", phonetic: "/wood/", meaning: "木头", example: "A piece of wood.", level: "A1" },
  { word: "word", phonetic: "/word/", meaning: "单词", example: "A new word.", level: "A1" },
  { word: "work", phonetic: "/work/", meaning: "工作", example: "Hard work.", level: "A1" },
  { word: "worker", phonetic: "/worker/", meaning: "工人", example: "A factory worker.", level: "A1" },
  { word: "world", phonetic: "/world/", meaning: "世界", example: "The whole world.", level: "A1" },
  { word: "worry", phonetic: "/worry/", meaning: "担心", example: "Do not worry.", level: "A1" },
  { word: "worse", phonetic: "/worse/", meaning: "更糟的", example: "It got worse.", level: "A1" },
  { word: "worst", phonetic: "/worst/", meaning: "最糟的", example: "The worst day.", level: "A1" },
  { word: "worth", phonetic: "/worth/", meaning: "值得", example: "It is worth it.", level: "A1" },
  { word: "would", phonetic: "/would/", meaning: "会", example: "I would go.", level: "A1" },
  { word: "wound", phonetic: "/wound/", meaning: "伤口", example: "A deep wound.", level: "A1" },
  { word: "wrap", phonetic: "/wrap/", meaning: "包", example: "Wrap the gift.", level: "A1" },
  { word: "write", phonetic: "/write/", meaning: "写", example: "Write a letter.", level: "A1" },
  { word: "wrong", phonetic: "/wrong/", meaning: "错误的", example: "That is wrong.", level: "A1" },
  { word: "yard", phonetic: "/yard/", meaning: "院子", example: "A big yard.", level: "A1" },
  { word: "year", phonetic: "/year/", meaning: "年", example: "This year.", level: "A1" },
  { word: "yellow", phonetic: "/yellow/", meaning: "黄色", example: "A yellow flower.", level: "A1" },
  { word: "yes", phonetic: "/yes/", meaning: "是", example: "Yes, I do.", level: "A1" },
  { word: "yesterday", phonetic: "/yesterday/", meaning: "昨天", example: "Yesterday was fun.", level: "A1" },
  { word: "yet", phonetic: "/yet/", meaning: "还", example: "Not yet.", level: "A1" },
  { word: "you", phonetic: "/you/", meaning: "你", example: "How are you?", level: "A1" },
  { word: "young", phonetic: "/young/", meaning: "年轻的", example: "A young person.", level: "A1" },
  { word: "your", phonetic: "/your/", meaning: "你的", example: "Your book.", level: "A1" },
  { word: "youth", phonetic: "/youth/", meaning: "青春", example: "A happy youth.", level: "A1" },
  { word: "zero", phonetic: "/zero/", meaning: "零", example: "Zero waste.", level: "A1" },
  { word: "zone", phonetic: "/zone/", meaning: "区域", example: "A safe zone.", level: "A1" },
  { word: "alarm", phonetic: "/əˈlɑːrm/", meaning: "闹钟", example: "Set the alarm.", level: "A1" },
  { word: "as", phonetic: "/æz/", meaning: "作为", example: "As a student.", level: "A1" },
  { word: "at", phonetic: "/æt/", meaning: "在", example: "At home.", level: "A1" },
  { word: "attack", phonetic: "/əˈtæk/", meaning: "攻击", example: "Do not attack others.", level: "A1" },
  { word: "be", phonetic: "/biː/", meaning: "是", example: "I want to be a teacher.", level: "A1" },
  { word: "but", phonetic: "/bʌt/", meaning: "但是", example: "But I disagree.", level: "A1" },
  { word: "by", phonetic: "/baɪ/", meaning: "通过", example: "By car.", level: "A1" },
  { word: "can", phonetic: "/kæn/", meaning: "能", example: "I can swim.", level: "A1" },
  { word: "capital", phonetic: "/ˈkæpɪtl/", meaning: "首都", example: "The capital city.", level: "A1" },
  { word: "concern", phonetic: "/kənˈsɜːrn/", meaning: "关心", example: "I have a concern.", level: "A1" },
  { word: "condition", phonetic: "/kənˈdɪʃn/", meaning: "条件", example: "Good condition.", level: "A1" },
  { word: "dad", phonetic: "/dæd/", meaning: "爸爸", example: "My dad is kind.", level: "A1" },
  { word: "day", phonetic: "/deɪ/", meaning: "天", example: "Have a good day.", level: "A1" },
  { word: "dull", phonetic: "/dʌl/", meaning: "无聊的", example: "A dull day.", level: "A1" },
  { word: "feature", phonetic: "/ˈfiːtʃər/", meaning: "特征", example: "A special feature.", level: "A1" },
  { word: "gas", phonetic: "/ɡæs/", meaning: "气体", example: "Natural gas.", level: "A1" },
  { word: "god", phonetic: "/ɡɒd/", meaning: "上帝", example: "Oh my god.", level: "A1" },
  { word: "gun", phonetic: "/ɡʌn/", meaning: "枪", example: "No guns.", level: "A1" },
  { word: "have", phonetic: "/hæv/", meaning: "有", example: "I have a cat.", level: "A1" },
  { word: "host", phonetic: "/hoʊst/", meaning: "主人", example: "A good host.", level: "A1" },
  { word: "how", phonetic: "/haʊ/", meaning: "如何", example: "How are you?", level: "A1" },
  { word: "indeed", phonetic: "/ɪnˈdiːd/", meaning: "确实", example: "Indeed it is.", level: "A1" },
  { word: "indicate", phonetic: "/ˈɪndɪkeɪt/", meaning: "指出", example: "Indicate the way.", level: "A1" },
  { word: "individual", phonetic: "/ˌɪndɪˈvɪdʒuəl/", meaning: "个人", example: "Each individual.", level: "A1" },
  { word: "inform", phonetic: "/ɪnˈfɔːrm/", meaning: "通知", example: "Inform me.", level: "A1" },
  { word: "initial", phonetic: "/ɪˈnɪʃl/", meaning: "初始的", example: "The initial step.", level: "A1" },
  { word: "invade", phonetic: "/ɪnˈveɪd/", meaning: "入侵", example: "Do not invade.", level: "A1" },
  { word: "itself", phonetic: "/ɪtˈself/", meaning: "它自己", example: "The door opened itself.", level: "A1" },
  { word: "junior", phonetic: "/ˈdʒuːniər/", meaning: "初级的", example: "A junior student.", level: "A1" },
  { word: "lay", phonetic: "/leɪ/", meaning: "放置", example: "Lay it down.", level: "A1" },
  { word: "account", phonetic: "/account/", meaning: "账户", example: "Open a bank account.", level: "A2" },
  { word: "achieve", phonetic: "/achieve/", meaning: "实现", example: "Achieve your goals.", level: "A2" },
  { word: "addition", phonetic: "/addition/", meaning: "加法", example: "In addition to this.", level: "A2" },
  { word: "address", phonetic: "/address/", meaning: "地址", example: "What is your address?", level: "A2" },
  { word: "administration", phonetic: "/administration/", meaning: "管理", example: "The administration is efficient.", level: "A2" },
  { word: "admire", phonetic: "/admire/", meaning: "钦佩", example: "I admire your courage.", level: "A2" },
  { word: "adopt", phonetic: "/adopt/", meaning: "采纳", example: "Adopt a new approach.", level: "A2" },
  { word: "advance", phonetic: "/advance/", meaning: "进步", example: "Technology advances quickly.", level: "A2" },
  { word: "advantage", phonetic: "/advantage/", meaning: "优势", example: "Take advantage of this.", level: "A2" },
  { word: "adventure", phonetic: "/adventure/", meaning: "冒险", example: "Life is an adventure.", level: "A2" },
  { word: "advertise", phonetic: "/advertise/", meaning: "广告", example: "Advertise your product.", level: "A2" },
  { word: "affect", phonetic: "/affect/", meaning: "影响", example: "Weather affects mood.", level: "A2" },
  { word: "afford", phonetic: "/afford/", meaning: "负担", example: "I cannot afford it.", level: "A2" },
  { word: "agency", phonetic: "/agency/", meaning: "机构", example: "A travel agency.", level: "A2" },
  { word: "agent", phonetic: "/agent/", meaning: "代理人", example: "A real estate agent.", level: "A2" },
  { word: "aggressive", phonetic: "/aggressive/", meaning: "好斗的", example: "Do not be aggressive.", level: "A2" },
  { word: "agriculture", phonetic: "/agriculture/", meaning: "农业", example: "Agriculture is important.", level: "A2" },
  { word: "aim", phonetic: "/aim/", meaning: "目标", example: "My aim is to learn.", level: "A2" },
  { word: "alcohol", phonetic: "/alcohol/", meaning: "酒精", example: "Avoid alcohol.", level: "A2" },
  { word: "alternative", phonetic: "/alternative/", meaning: "替代", example: "An alternative way.", level: "A2" },
  { word: "ambition", phonetic: "/ambition/", meaning: "野心", example: "She has ambition.", level: "A2" },
  { word: "amount", phonetic: "/amount/", meaning: "数量", example: "A large amount.", level: "A2" },
  { word: "analyse", phonetic: "/analyse/", meaning: "分析", example: "Analyse the data.", level: "A2" },
  { word: "ancestor", phonetic: "/ancestor/", meaning: "祖先", example: "Our ancestors.", level: "A2" },
  { word: "annual", phonetic: "/annual/", meaning: "年度的", example: "An annual report.", level: "A2" },
  { word: "anxiety", phonetic: "/anxiety/", meaning: "焦虑", example: "Anxiety is common.", level: "A2" },
  { word: "anyway", phonetic: "/anyway/", meaning: "无论如何", example: "Anyway, let us go.", level: "A2" },
  { word: "apartment", phonetic: "/apartment/", meaning: "公寓", example: "A nice apartment.", level: "A2" },
  { word: "apologize", phonetic: "/apologize/", meaning: "道歉", example: "I apologize.", level: "A2" },
  { word: "apparent", phonetic: "/apparent/", meaning: "明显的", example: "The answer is apparent.", level: "A2" },
  { word: "apparently", phonetic: "/apparently/", meaning: "显然", example: "Apparently so.", level: "A2" },
  { word: "appeal", phonetic: "/appeal/", meaning: "呼吁", example: "Appeal for help.", level: "A2" },
  { word: "appetite", phonetic: "/appetite/", meaning: "食欲", example: "A big appetite.", level: "A2" },
  { word: "application", phonetic: "/application/", meaning: "申请", example: "Submit your application.", level: "A2" },
  { word: "appointment", phonetic: "/appointment/", meaning: "预约", example: "Make an appointment.", level: "A2" },
  { word: "appreciate", phonetic: "/appreciate/", meaning: "感激", example: "I appreciate it.", level: "A2" },
  { word: "approach", phonetic: "/approach/", meaning: "方法", example: "A new approach.", level: "A2" },
  { word: "appropriate", phonetic: "/appropriate/", meaning: "适当的", example: "Appropriate behavior.", level: "A2" },
  { word: "approve", phonetic: "/approve/", meaning: "批准", example: "The plan was approved.", level: "A2" },
  { word: "architect", phonetic: "/architect/", meaning: "建筑师", example: "A famous architect.", level: "A2" },
  { word: "argument", phonetic: "/argument/", meaning: "争论", example: "A strong argument.", level: "A2" },
  { word: "arrange", phonetic: "/arrange/", meaning: "安排", example: "Arrange the meeting.", level: "A2" },
  { word: "arrest", phonetic: "/arrest/", meaning: "逮捕", example: "Arrest the suspect.", level: "A2" },
  { word: "arrow", phonetic: "/arrow/", meaning: "箭头", example: "Follow the arrow.", level: "A2" },
  { word: "article", phonetic: "/article/", meaning: "文章", example: "Read the article.", level: "A2" },
  { word: "aside", phonetic: "/aside/", meaning: "在旁边", example: "Step aside.", level: "A2" },
  { word: "aspect", phonetic: "/aspect/", meaning: "方面", example: "Every aspect.", level: "A2" },
  { word: "assess", phonetic: "/assess/", meaning: "评估", example: "Assess the situation.", level: "A2" },
  { word: "assignment", phonetic: "/assignment/", meaning: "作业", example: "Complete the assignment.", level: "A2" },
  { word: "assist", phonetic: "/assist/", meaning: "协助", example: "Assist the team.", level: "A2" },
  { word: "associate", phonetic: "/associate/", meaning: "联系", example: "Associate the ideas.", level: "A2" },
  { word: "assume", phonetic: "/assume/", meaning: "假设", example: "Do not assume.", level: "A2" },
  { word: "atmosphere", phonetic: "/atmosphere/", meaning: "气氛", example: "A warm atmosphere.", level: "A2" },
  { word: "attach", phonetic: "/attach/", meaning: "附上", example: "Attach the file.", level: "A2" },
  { word: "attempt", phonetic: "/attempt/", meaning: "尝试", example: "Make an attempt.", level: "A2" },
  { word: "attend", phonetic: "/attend/", meaning: "参加", example: "Attend the class.", level: "A2" },
  { word: "attract", phonetic: "/attract/", meaning: "吸引", example: "Attract attention.", level: "A2" },
  { word: "audience", phonetic: "/audience/", meaning: "观众", example: "The audience cheered.", level: "A2" },
  { word: "authority", phonetic: "/authority/", meaning: "权威", example: "The authority decides.", level: "A2" },
  { word: "average", phonetic: "/average/", meaning: "平均", example: "The average score.", level: "A2" },
  { word: "aware", phonetic: "/aware/", meaning: "意识到", example: "Be aware of risks.", level: "A2" },
  { word: "abstract", phonetic: "/abstract/", meaning: "抽象的", example: "An abstract concept.", level: "B1" },
  { word: "abuse", phonetic: "/abuse/", meaning: "滥用", example: "Do not abuse power.", level: "B1" },
  { word: "academic", phonetic: "/academic/", meaning: "学术的", example: "Academic research.", level: "B1" },
  { word: "accelerate", phonetic: "/accelerate/", meaning: "加速", example: "Accelerate progress.", level: "B1" },
  { word: "accommodate", phonetic: "/accommodate/", meaning: "容纳", example: "Accommodate guests.", level: "B1" },
  { word: "accompany", phonetic: "/accompany/", meaning: "陪伴", example: "Accompany me.", level: "B1" },
  { word: "accomplish", phonetic: "/accomplish/", meaning: "完成", example: "Accomplish the task.", level: "B1" },
  { word: "accurate", phonetic: "/accurate/", meaning: "准确的", example: "Accurate information.", level: "B1" },
  { word: "accuse", phonetic: "/accuse/", meaning: "指控", example: "Accuse someone.", level: "B1" },
  { word: "acknowledge", phonetic: "/acknowledge/", meaning: "承认", example: "Acknowledge the truth.", level: "B1" },
  { word: "acquire", phonetic: "/acquire/", meaning: "获得", example: "Acquire knowledge.", level: "B1" },
  { word: "adapt", phonetic: "/adapt/", meaning: "适应", example: "Adapt to change.", level: "B1" },
  { word: "adequate", phonetic: "/adequate/", meaning: "足够的", example: "Adequate preparation.", level: "B1" },
  { word: "adjust", phonetic: "/adjust/", meaning: "调整", example: "Adjust the settings.", level: "B1" },
  { word: "adolescent", phonetic: "/adolescent/", meaning: "青少年", example: "Adolescent behavior.", level: "B1" },
  { word: "advocate", phonetic: "/advocate/", meaning: "提倡", example: "Advocate for change.", level: "B1" },
  { word: "affair", phonetic: "/affair/", meaning: "事务", example: "A private affair.", level: "B1" },
  { word: "agenda", phonetic: "/agenda/", meaning: "议程", example: "The meeting agenda.", level: "B1" },
  { word: "aid", phonetic: "/aid/", meaning: "援助", example: "Provide aid.", level: "B1" },
  { word: "alien", phonetic: "/alien/", meaning: "外星人", example: "Alien life forms.", level: "B1" },
  { word: "align", phonetic: "/align/", meaning: "对齐", example: "Align the text.", level: "B1" },
  { word: "allocate", phonetic: "/allocate/", meaning: "分配", example: "Allocate resources.", level: "B1" },
  { word: "alter", phonetic: "/alter/", meaning: "改变", example: "Alter the plan.", level: "B1" },
  { word: "ambitious", phonetic: "/ambitious/", meaning: "有野心的", example: "An ambitious project.", level: "B1" },
  { word: "amendment", phonetic: "/amendment/", meaning: "修正", example: "An amendment to the law.", level: "B1" },
  { word: "ample", phonetic: "/ample/", meaning: "充足的", example: "Ample time.", level: "B1" },
  { word: "anticipate", phonetic: "/anticipate/", meaning: "预料", example: "Anticipate problems.", level: "B1" },
  { word: "apparatus", phonetic: "/apparatus/", meaning: "设备", example: "Laboratory apparatus.", level: "B1" },
  { word: "applicable", phonetic: "/applicable/", meaning: "适用的", example: "Applicable rules.", level: "B1" },
  { word: "appraisal", phonetic: "/appraisal/", meaning: "评估", example: "Property appraisal.", level: "B1" },
  { word: "apprehend", phonetic: "/apprehend/", meaning: "逮捕", example: "Apprehend the suspect.", level: "B1" },
  { word: "arbitrary", phonetic: "/arbitrary/", meaning: "任意的", example: "An arbitrary decision.", level: "B1" },
  { word: "articulate", phonetic: "/articulate/", meaning: "表达", example: "Articulate your thoughts.", level: "B1" },
  { word: "aspire", phonetic: "/aspire/", meaning: "渴望", example: "Aspire to greatness.", level: "B1" },
  { word: "assert", phonetic: "/assert/", meaning: "主张", example: "Assert your rights.", level: "B1" },
  { word: "asset", phonetic: "/asset/", meaning: "财产", example: "A valuable asset.", level: "B1" },
  { word: "assimilate", phonetic: "/assimilate/", meaning: "同化", example: "Assimilate into culture.", level: "B1" },
  { word: "assumption", phonetic: "/assumption/", meaning: "假设", example: "A false assumption.", level: "B1" },
  { word: "asylum", phonetic: "/asylum/", meaning: "庇护", example: "Seek asylum.", level: "B1" },
  { word: "attain", phonetic: "/attain/", meaning: "达到", example: "Attain your goals.", level: "B1" },
  { word: "attribute", phonetic: "/attribute/", meaning: "归因", example: "Attribute success to effort.", level: "B1" },
  { word: "authorize", phonetic: "/authorize/", meaning: "授权", example: "Authorize the action.", level: "B1" },
  { word: "autonomy", phonetic: "/autonomy/", meaning: "自治", example: "Personal autonomy.", level: "B1" },
  { word: "backdrop", phonetic: "/backdrop/", meaning: "背景", example: "Against the backdrop.", level: "B1" },
  { word: "benchmark", phonetic: "/benchmark/", meaning: "基准", example: "Set a benchmark.", level: "B1" },
  { word: "bias", phonetic: "/bias/", meaning: "偏见", example: "Avoid bias.", level: "B1" },
  { word: "bizarre", phonetic: "/bizarre/", meaning: "奇怪的", example: "A bizarre story.", level: "B1" },
  { word: "bloom", phonetic: "/bloom/", meaning: "开花", example: "Flowers bloom.", level: "B1" },
  { word: "bolster", phonetic: "/bolster/", meaning: "支持", example: "Bolster confidence.", level: "B1" },
  { word: "boycott", phonetic: "/boycott/", meaning: "抵制", example: "Boycott the product.", level: "B1" },
  { word: "breach", phonetic: "/breach/", meaning: "违反", example: "A breach of contract.", level: "B1" },
  { word: "brief", phonetic: "/brief/", meaning: "简短的", example: "A brief summary.", level: "B1" },
  { word: "browse", phonetic: "/browse/", meaning: "浏览", example: "Browse the web.", level: "B1" },
  { word: "bulk", phonetic: "/bulk/", meaning: "大量", example: "Buy in bulk.", level: "B1" },
  { word: "burden", phonetic: "/burden/", meaning: "负担", example: "A heavy burden.", level: "B1" },
  { word: "bureaucracy", phonetic: "/bureaucracy/", meaning: "官僚主义", example: "Reduce bureaucracy.", level: "B1" },
  { word: "campaign", phonetic: "/campaign/", meaning: "运动", example: "A marketing campaign.", level: "B1" },
  { word: "candidate", phonetic: "/candidate/", meaning: "候选人", example: "A strong candidate.", level: "B1" },
  { word: "capability", phonetic: "/capability/", meaning: "能力", example: "Technical capability.", level: "B1" },
  { word: "capacity", phonetic: "/capacity/", meaning: "容量", example: "Full capacity.", level: "B1" },
  { word: "cascade", phonetic: "/cascade/", meaning: "级联", example: "A cascade of events.", level: "B1" },
  { word: "catastrophe", phonetic: "/catastrophe/", meaning: "灾难", example: "A natural catastrophe.", level: "B1" },
  { word: "cease", phonetic: "/cease/", meaning: "停止", example: "Cease fire.", level: "B1" },
  { word: "chronic", phonetic: "/chronic/", meaning: "慢性的", example: "Chronic pain.", level: "B1" },
  { word: "circulate", phonetic: "/circulate/", meaning: "流通", example: "Information circulates.", level: "B1" },
  { word: "cite", phonetic: "/cite/", meaning: "引用", example: "Cite your sources.", level: "B1" },
  { word: "clarify", phonetic: "/clarify/", meaning: "澄清", example: "Clarify the issue.", level: "B1" },
  { word: "clause", phonetic: "/clause/", meaning: "条款", example: "A contract clause.", level: "B1" },
  { word: "coalition", phonetic: "/coalition/", meaning: "联盟", example: "Form a coalition.", level: "B1" },
  { word: "cognitive", phonetic: "/cognitive/", meaning: "认知的", example: "Cognitive skills.", level: "B1" },
  { word: "coincide", phonetic: "/coincide/", meaning: "巧合", example: "Events coincide.", level: "B1" },
  { word: "collaborate", phonetic: "/collaborate/", meaning: "合作", example: "Collaborate with others.", level: "B1" },
  { word: "collapse", phonetic: "/collapse/", meaning: "崩溃", example: "The system collapsed.", level: "B1" },
  { word: "commemorate", phonetic: "/commemorate/", meaning: "纪念", example: "Commemorate the event.", level: "B1" },
  { word: "commence", phonetic: "/commence/", meaning: "开始", example: "The show commences.", level: "B1" },
  { word: "commission", phonetic: "/commission/", meaning: "委员会", example: "A government commission.", level: "B1" },
  { word: "commodity", phonetic: "/commodity/", meaning: "商品", example: "A valuable commodity.", level: "B1" },
  { word: "communal", phonetic: "/communal/", meaning: "公共的", example: "Communal space.", level: "B1" },
  { word: "compact", phonetic: "/compact/", meaning: "紧凑的", example: "A compact design.", level: "B1" },
  { word: "comparable", phonetic: "/comparable/", meaning: "可比的", example: "Comparable results.", level: "B1" },
  { word: "compassion", phonetic: "/compassion/", meaning: "同情", example: "Show compassion.", level: "B1" },
  { word: "compel", phonetic: "/compel/", meaning: "迫使", example: "Compel action.", level: "B1" },
  { word: "compensate", phonetic: "/compensate/", meaning: "补偿", example: "Compensate for loss.", level: "B1" },
  { word: "compile", phonetic: "/compile/", meaning: "编译", example: "Compile the data.", level: "B1" },
  { word: "complement", phonetic: "/complement/", meaning: "补充", example: "Complement each other.", level: "B1" },
  { word: "complex", phonetic: "/complex/", meaning: "复杂的", example: "A complex problem.", level: "B1" },
  { word: "comply", phonetic: "/comply/", meaning: "遵守", example: "Comply with rules.", level: "B1" },
  { word: "component", phonetic: "/component/", meaning: "组件", example: "A key component.", level: "B1" },
  { word: "compose", phonetic: "/compose/", meaning: "组成", example: "Composed of parts.", level: "B1" },
  { word: "comprehensive", phonetic: "/comprehensive/", meaning: "全面的", example: "A comprehensive review.", level: "B1" },
  { word: "compromise", phonetic: "/compromise/", meaning: "妥协", example: "Reach a compromise.", level: "B1" },
  { word: "compulsory", phonetic: "/compulsory/", meaning: "强制的", example: "Compulsory education.", level: "B1" },
  { word: "conceive", phonetic: "/conceive/", meaning: "构想", example: "Conceive a plan.", level: "B1" },
  { word: "concentrate", phonetic: "/concentrate/", meaning: "集中", example: "Concentrate on work.", level: "B1" },
  { word: "conception", phonetic: "/conception/", meaning: "概念", example: "A clear conception.", level: "B1" },
  { word: "conclude", phonetic: "/conclude/", meaning: "总结", example: "Conclude the meeting.", level: "B1" },
  { word: "concrete", phonetic: "/concrete/", meaning: "具体的", example: "A concrete example.", level: "B1" },
  { word: "condemn", phonetic: "/condemn/", meaning: "谴责", example: "Condemn violence.", level: "B1" },
  { word: "conduct", phonetic: "/conduct/", meaning: "进行", example: "Conduct research.", level: "B1" },
  { word: "confine", phonetic: "/confine/", meaning: "限制", example: "Confine the area.", level: "B1" },
  { word: "confirm", phonetic: "/confirm/", meaning: "确认", example: "Confirm the booking.", level: "B1" },
  { word: "conform", phonetic: "/conform/", meaning: "遵守", example: "Conform to standards.", level: "B1" },
  { word: "confront", phonetic: "/confront/", meaning: "面对", example: "Confront your fears.", level: "B1" },
  { word: "congress", phonetic: "/congress/", meaning: "国会", example: "Congress meets.", level: "B1" },
  { word: "conscience", phonetic: "/conscience/", meaning: "良心", example: "Follow your conscience.", level: "B1" },
  { word: "consensus", phonetic: "/consensus/", meaning: "共识", example: "Reach a consensus.", level: "B1" },
  { word: "consent", phonetic: "/consent/", meaning: "同意", example: "Give consent.", level: "B1" },
  { word: "consequence", phonetic: "/consequence/", meaning: "后果", example: "Face the consequences.", level: "B1" },
  { word: "conserve", phonetic: "/conserve/", meaning: "保护", example: "Conserve energy.", level: "B1" },
  { word: "considerable", phonetic: "/considerable/", meaning: "相当大的", example: "A considerable amount.", level: "B1" },
  { word: "consist", phonetic: "/consist/", meaning: "由…组成", example: "Consists of parts.", level: "B1" },
  { word: "consistent", phonetic: "/consistent/", meaning: "一致的", example: "Be consistent.", level: "B1" },
  { word: "constitute", phonetic: "/constitute/", meaning: "构成", example: "Constitute the whole.", level: "B1" },
  { word: "construct", phonetic: "/construct/", meaning: "建造", example: "Construct a building.", level: "B1" },
  { word: "consult", phonetic: "/consult/", meaning: "咨询", example: "Consult an expert.", level: "B1" },
  { word: "consume", phonetic: "/consume/", meaning: "消耗", example: "Consume less energy.", level: "B1" },
  { word: "contemplate", phonetic: "/contemplate/", meaning: "沉思", example: "Contemplate the idea.", level: "B1" },
  { word: "contemporary", phonetic: "/contemporary/", meaning: "当代的", example: "Contemporary art.", level: "B1" },
  { word: "contempt", phonetic: "/contempt/", meaning: "蔑视", example: "Show contempt.", level: "B1" },
  { word: "contend", phonetic: "/contend/", meaning: "竞争", example: "Contend for the prize.", level: "B1" },
  { word: "context", phonetic: "/context/", meaning: "背景", example: "In this context.", level: "B1" },
  { word: "contradict", phonetic: "/contradict/", meaning: "反驳", example: "Contradict the claim.", level: "B1" },
  { word: "contrary", phonetic: "/contrary/", meaning: "相反的", example: "On the contrary.", level: "B1" },
  { word: "contrast", phonetic: "/contrast/", meaning: "对比", example: "In contrast to.", level: "B1" },
  { word: "contribute", phonetic: "/contribute/", meaning: "贡献", example: "Contribute to society.", level: "B1" },
  { word: "controversial", phonetic: "/controversial/", meaning: "有争议的", example: "A controversial topic.", level: "B1" },
  { word: "controversy", phonetic: "/controversy/", meaning: "争论", example: "A heated controversy.", level: "B1" },
  { word: "convention", phonetic: "/convention/", meaning: "惯例", example: "Follow convention.", level: "B1" },
  { word: "convert", phonetic: "/convert/", meaning: "转换", example: "Convert the currency.", level: "B1" },
  { word: "convey", phonetic: "/convey/", meaning: "传达", example: "Convey the message.", level: "B1" },
  { word: "convince", phonetic: "/convince/", meaning: "说服", example: "Convince them.", level: "B1" },
  { word: "cooperate", phonetic: "/cooperate/", meaning: "合作", example: "Cooperate together.", level: "B1" },
  { word: "coordinate", phonetic: "/coordinate/", meaning: "协调", example: "Coordinate efforts.", level: "B1" },
  { word: "cope", phonetic: "/cope/", meaning: "应对", example: "Cope with stress.", level: "B1" },
  { word: "core", phonetic: "/core/", meaning: "核心", example: "The core issue.", level: "B1" },
  { word: "corporate", phonetic: "/corporate/", meaning: "企业的", example: "Corporate culture.", level: "B1" },
  { word: "correspond", phonetic: "/correspond/", meaning: "对应", example: "Correspond to data.", level: "B1" },
  { word: "corrupt", phonetic: "/corrupt/", meaning: "腐败的", example: "Corrupt officials.", level: "B1" },
  { word: "counsel", phonetic: "/counsel/", meaning: "建议", example: "Legal counsel.", level: "B1" },
  { word: "counterpart", phonetic: "/counterpart/", meaning: "对应的人", example: "Your counterpart.", level: "B1" },
  { word: "coup", phonetic: "/coup/", meaning: "政变", example: "A military coup.", level: "B1" },
  { word: "courtesy", phonetic: "/courtesy/", meaning: "礼貌", example: "Courtesy matters.", level: "B1" },
  { word: "coverage", phonetic: "/coverage/", meaning: "报道", example: "Media coverage.", level: "B1" },
  { word: "crack", phonetic: "/crack/", meaning: "裂缝", example: "A crack in the wall.", level: "B1" },
  { word: "craft", phonetic: "/craft/", meaning: "工艺", example: "Learn a craft.", level: "B1" },
  { word: "credentials", phonetic: "/credentials/", meaning: "资质", example: "Check credentials.", level: "B1" },
  { word: "crew", phonetic: "/crew/", meaning: "团队", example: "The ship crew.", level: "B1" },
  { word: "criteria", phonetic: "/criteria/", meaning: "标准", example: "Meet the criteria.", level: "B1" },
  { word: "critique", phonetic: "/critique/", meaning: "评论", example: "Write a critique.", level: "B1" },
  { word: "crucial", phonetic: "/crucial/", meaning: "关键的", example: "A crucial moment.", level: "B1" },
  { word: "cultivate", phonetic: "/cultivate/", meaning: "培养", example: "Cultivate habits.", level: "B1" },
  { word: "curiosity", phonetic: "/curiosity/", meaning: "好奇心", example: "Natural curiosity.", level: "B1" },
  { word: "curriculum", phonetic: "/curriculum/", meaning: "课程", example: "The school curriculum.", level: "B1" },
  { word: "custody", phonetic: "/custody/", meaning: "监护", example: "Child custody.", level: "B1" },
  { word: "customs", phonetic: "/customs/", meaning: "海关", example: "Pass through customs.", level: "B1" },
  { word: "cynical", phonetic: "/cynical/", meaning: "愤世嫉俗的", example: "A cynical view.", level: "B1" },
  { word: "abolish", phonetic: "/abolish/", meaning: "废除", example: "Abolish the law.", level: "B2" },
  { word: "abortion", phonetic: "/abortion/", meaning: "堕胎", example: "Abortion debate.", level: "B2" },
  { word: "absorb", phonetic: "/absorb/", meaning: "吸收", example: "Absorb knowledge.", level: "B2" },
  { word: "absurd", phonetic: "/absurd/", meaning: "荒谬的", example: "An absurd idea.", level: "B2" },
  { word: "abundance", phonetic: "/abundance/", meaning: "丰富", example: "An abundance of food.", level: "B2" },
  { word: "accumulate", phonetic: "/accumulate/", meaning: "积累", example: "Accumulate wealth.", level: "B2" },
  { word: "acquisition", phonetic: "/acquisition/", meaning: "收购", example: "A business acquisition.", level: "B2" },
  { word: "aggregate", phonetic: "/aggregate/", meaning: "总计", example: "Aggregate amount.", level: "B2" },
  { word: "alert", phonetic: "/alert/", meaning: "警觉的", example: "Stay alert.", level: "B2" },
  { word: "ambiguous", phonetic: "/ambiguous/", meaning: "模糊的", example: "An ambiguous answer.", level: "B2" },
  { word: "amend", phonetic: "/amend/", meaning: "修改", example: "Amend the contract.", level: "B2" },
  { word: "analogy", phonetic: "/analogy/", meaning: "类比", example: "Use an analogy.", level: "B2" },
  { word: "pants", phonetic: "/pants/", meaning: "裤子", example: "Blue pants.", level: "A2" },
  { word: "skirt", phonetic: "/skirt/", meaning: "裙子", example: "A short skirt.", level: "A2" },
  { word: "cap", phonetic: "/cap/", meaning: "帽子", example: "A baseball cap.", level: "A2" },
  { word: "scarf", phonetic: "/scarf/", meaning: "围巾", example: "A silk scarf.", level: "A2" },
  { word: "gloves", phonetic: "/gloves/", meaning: "手套", example: "Leather gloves.", level: "A2" },
  { word: "belt", phonetic: "/belt/", meaning: "皮带", example: "A black belt.", level: "A2" },
  { word: "socks", phonetic: "/socks/", meaning: "袜子", example: "Cotton socks.", level: "A2" },
  { word: "shoes", phonetic: "/shoes/", meaning: "鞋子", example: "Running shoes.", level: "A2" },
  { word: "boots", phonetic: "/boots/", meaning: "靴子", example: "Rain boots.", level: "A2" },
  { word: "sandals", phonetic: "/sandals/", meaning: "凉鞋", example: "Beach sandals.", level: "A2" },
  { word: "sneakers", phonetic: "/sneakers/", meaning: "运动鞋", example: "White sneakers.", level: "A2" },
  { word: "uniform", phonetic: "/uniform/", meaning: "校服", example: "School uniform.", level: "A2" },
  { word: "pajamas", phonetic: "/pajamas/", meaning: "睡衣", example: "Soft pajamas.", level: "A2" },
  { word: "sweater", phonetic: "/sweater/", meaning: "毛衣", example: "A wool sweater.", level: "A2" },
  { word: "jeans", phonetic: "/jeans/", meaning: "牛仔裤", example: "Blue jeans.", level: "A2" },
  { word: "blouse", phonetic: "/blouse/", meaning: "女衬衫", example: "A silk blouse.", level: "A2" },
  { word: "shorts", phonetic: "/shorts/", meaning: "短裤", example: "Summer shorts.", level: "A2" },
  { word: "underwear", phonetic: "/underwear/", meaning: "内衣", example: "Clean underwear.", level: "A2" },
  { word: "grape", phonetic: "/grape/", meaning: "葡萄", example: "Sweet grapes.", level: "A2" },
  { word: "strawberry", phonetic: "/strawberry/", meaning: "草莓", example: "Fresh strawberries.", level: "A2" },
  { word: "watermelon", phonetic: "/watermelon/", meaning: "西瓜", example: "A big watermelon.", level: "A2" },
  { word: "peach", phonetic: "/peach/", meaning: "桃子", example: "A juicy peach.", level: "A2" },
  { word: "pear", phonetic: "/pear/", meaning: "梨", example: "A green pear.", level: "A2" },
  { word: "cherry", phonetic: "/cherry/", meaning: "樱桃", example: "Red cherries.", level: "A2" },
  { word: "lemon", phonetic: "/lemon/", meaning: "柠檬", example: "Sour lemon.", level: "A2" },
  { word: "mango", phonetic: "/mango/", meaning: "芒果", example: "Ripe mango.", level: "A2" },
  { word: "pineapple", phonetic: "/pineapple/", meaning: "菠萝", example: "Tropical pineapple.", level: "A2" },
  { word: "coconut", phonetic: "/coconut/", meaning: "椰子", example: "Coconut milk.", level: "A2" },
  { word: "avocado", phonetic: "/avocado/", meaning: "牛油果", example: "Avocado toast.", level: "A2" },
  { word: "tomato", phonetic: "/tomato/", meaning: "番茄", example: "Tomato soup.", level: "A2" },
  { word: "carrot", phonetic: "/carrot/", meaning: "胡萝卜", example: "A orange carrot.", level: "A2" },
  { word: "onion", phonetic: "/onion/", meaning: "洋葱", example: "Chopped onion.", level: "A2" },
  { word: "garlic", phonetic: "/garlic/", meaning: "大蒜", example: "Fresh garlic.", level: "A2" },
  { word: "pepper", phonetic: "/pepper/", meaning: "辣椒", example: "Hot pepper.", level: "A2" },
  { word: "cucumber", phonetic: "/cucumber/", meaning: "黄瓜", example: "Sliced cucumber.", level: "A2" },
  { word: "lettuce", phonetic: "/lettuce/", meaning: "生菜", example: "Fresh lettuce.", level: "A2" },
  { word: "cabbage", phonetic: "/cabbage/", meaning: "卷心菜", example: "Green cabbage.", level: "A2" },
  { word: "broccoli", phonetic: "/broccoli/", meaning: "西兰花", example: "Steamed broccoli.", level: "A2" },
  { word: "mushroom", phonetic: "/mushroom/", meaning: "蘑菇", example: "Wild mushrooms.", level: "A2" },
  { word: "corn", phonetic: "/corn/", meaning: "玉米", example: "Sweet corn.", level: "A2" },
  { word: "peas", phonetic: "/peas/", meaning: "豌豆", example: "Green peas.", level: "A2" },
  { word: "beans", phonetic: "/beans/", meaning: "豆子", example: "Red beans.", level: "A2" },
  { word: "rice", phonetic: "/rice/", meaning: "米饭", example: "Steamed rice.", level: "A2" },
  { word: "noodle", phonetic: "/noodle/", meaning: "面条", example: "Long noodles.", level: "A2" },
  { word: "toast", phonetic: "/toast/", meaning: "吐司", example: "Buttered toast.", level: "A2" },
  { word: "sandwich", phonetic: "/sandwich/", meaning: "三明治", example: "A ham sandwich.", level: "A2" },
  { word: "burger", phonetic: "/burger/", meaning: "汉堡", example: "A beef burger.", level: "A2" },
  { word: "pizza", phonetic: "/pizza/", meaning: "披萨", example: "Cheese pizza.", level: "A2" },
  { word: "pasta", phonetic: "/pasta/", meaning: "意面", example: "Italian pasta.", level: "A2" },
  { word: "salad", phonetic: "/salad/", meaning: "沙拉", example: "Green salad.", level: "A2" },
  { word: "steak", phonetic: "/steak/", meaning: "牛排", example: "A medium steak.", level: "A2" },
  { word: "pork", phonetic: "/pork/", meaning: "猪肉", example: "Roasted pork.", level: "A2" },
  { word: "beef", phonetic: "/beef/", meaning: "牛肉", example: "Beef stew.", level: "A2" },
  { word: "shrimp", phonetic: "/shrimp/", meaning: "虾", example: "Fried shrimp.", level: "A2" },
  { word: "yogurt", phonetic: "/yogurt/", meaning: "酸奶", example: "Greek yogurt.", level: "A2" },
  { word: "cream", phonetic: "/cream/", meaning: "奶油", example: "Whipped cream.", level: "A2" },
  { word: "vinegar", phonetic: "/vinegar/", meaning: "醋", example: "Apple vinegar.", level: "A2" },
  { word: "sauce", phonetic: "/sauce/", meaning: "酱油", example: "Soy sauce.", level: "A2" },
  { word: "honey", phonetic: "/honey/", meaning: "蜂蜜", example: "Natural honey.", level: "A2" },
  { word: "jam", phonetic: "/jam/", meaning: "果酱", example: "Strawberry jam.", level: "A2" },
  { word: "peanut", phonetic: "/peanut/", meaning: "花生", example: "Roasted peanuts.", level: "A2" },
  { word: "walnut", phonetic: "/walnut/", meaning: "核桃", example: "Cracked walnuts.", level: "A2" },
  { word: "almond", phonetic: "/almond/", meaning: "杏仁", example: "Sliced almonds.", level: "A2" },
  { word: "chocolate", phonetic: "/chocolate/", meaning: "巧克力", example: "Dark chocolate.", level: "A2" },
  { word: "candy", phonetic: "/candy/", meaning: "糖果", example: "Sweet candy.", level: "A2" },
  { word: "cookie", phonetic: "/cookie/", meaning: "饼干", example: "Chocolate cookies.", level: "A2" },
  { word: "ice cream", phonetic: "/ice cream/", meaning: "冰淇淋", example: "Vanilla ice cream.", level: "A2" },
  { word: "soda", phonetic: "/soda/", meaning: "汽水", example: "Cola soda.", level: "A2" },
  { word: "beer", phonetic: "/beer/", meaning: "啤酒", example: "Cold beer.", level: "A2" },
  { word: "elbow", phonetic: "/elbow/", meaning: "肘", example: "Bend your elbow.", level: "A2" },
  { word: "wrist", phonetic: "/wrist/", meaning: "手腕", example: "A watch on the wrist.", level: "A2" },
  { word: "thumb", phonetic: "/thumb/", meaning: "大拇指", example: "Give a thumbs up.", level: "A2" },
  { word: "chest", phonetic: "/chest/", meaning: "胸口", example: "A broad chest.", level: "A2" },
  { word: "waist", phonetic: "/waist/", meaning: "腰", example: "A slim waist.", level: "A2" },
  { word: "hip", phonetic: "/hip/", meaning: "臀部", example: "Wide hips.", level: "A2" },
  { word: "ankle", phonetic: "/ankle/", meaning: "脚踝", example: "Twist your ankle.", level: "A2" },
  { word: "toe", phonetic: "/toe/", meaning: "脚趾", example: "Wiggle your toes.", level: "A2" },
  { word: "muscle", phonetic: "/muscle/", meaning: "肌肉", example: "Arm muscles.", level: "A2" },
  { word: "lung", phonetic: "/lung/", meaning: "肺", example: "Deep lungs.", level: "A2" },
  { word: "living room", phonetic: "/living room/", meaning: "客厅", example: "A cozy living room.", level: "A2" },
  { word: "dining room", phonetic: "/dining room/", meaning: "餐厅", example: "A formal dining room.", level: "A2" },
  { word: "garage", phonetic: "/garage/", meaning: "车库", example: "A two-car garage.", level: "A2" },
  { word: "balcony", phonetic: "/balcony/", meaning: "阳台", example: "A sunny balcony.", level: "A2" },
  { word: "attic", phonetic: "/attic/", meaning: "阁楼", example: "A dusty attic.", level: "A2" },
  { word: "basement", phonetic: "/basement/", meaning: "地下室", example: "A dark basement.", level: "A2" },
  { word: "roof", phonetic: "/roof/", meaning: "屋顶", example: "A red roof.", level: "A2" },
  { word: "ceiling", phonetic: "/ceiling/", meaning: "天花板", example: "A high ceiling.", level: "A2" },
  { word: "stairs", phonetic: "/stairs/", meaning: "楼梯", example: "Climb the stairs.", level: "A2" },
  { word: "elevator", phonetic: "/elevator/", meaning: "电梯", example: "Take the elevator.", level: "A2" },
  { word: "hallway", phonetic: "/hallway/", meaning: "走廊", example: "A long hallway.", level: "A2" },
  { word: "closet", phonetic: "/closet/", meaning: "壁橱", example: "A walk-in closet.", level: "A2" },
  { word: "fence", phonetic: "/fence/", meaning: "篱笆", example: "A white fence.", level: "A2" },
  { word: "driveway", phonetic: "/driveway/", meaning: "车道", example: "A paved driveway.", level: "A2" },
  { word: "sofa", phonetic: "/sofa/", meaning: "沙发", example: "A leather sofa.", level: "A2" },
  { word: "couch", phonetic: "/couch/", meaning: "长沙发", example: "A soft couch.", level: "A2" },
  { word: "bookshelf", phonetic: "/bookshelf/", meaning: "书架", example: "A tall bookshelf.", level: "A2" },
  { word: "wardrobe", phonetic: "/wardrobe/", meaning: "衣柜", example: "A large wardrobe.", level: "A2" },
  { word: "dresser", phonetic: "/dresser/", meaning: "梳妆台", example: "A wooden dresser.", level: "A2" },
  { word: "nightstand", phonetic: "/nightstand/", meaning: "床头柜", example: "A bedside nightstand.", level: "A2" },
  { word: "mirror", phonetic: "/mirror/", meaning: "镜子", example: "A wall mirror.", level: "A2" },
  { word: "lamp", phonetic: "/lamp/", meaning: "灯", example: "A table lamp.", level: "A2" },
  { word: "carpet", phonetic: "/carpet/", meaning: "地毯", example: "A Persian carpet.", level: "A2" },
  { word: "curtain", phonetic: "/curtain/", meaning: "窗帘", example: "Red curtains.", level: "A2" },
  { word: "pillow", phonetic: "/pillow/", meaning: "枕头", example: "A soft pillow.", level: "A2" },
  { word: "blanket", phonetic: "/blanket/", meaning: "毯子", example: "A warm blanket.", level: "A2" },
  { word: "towel", phonetic: "/towel/", meaning: "毛巾", example: "A bath towel.", level: "A2" },
  { word: "sink", phonetic: "/sink/", meaning: "水槽", example: "A kitchen sink.", level: "A2" },
  { word: "toilet", phonetic: "/toilet/", meaning: "马桶", example: "A clean toilet.", level: "A2" },
  { word: "shower", phonetic: "/shower/", meaning: "淋浴", example: "A hot shower.", level: "A2" },
  { word: "bathtub", phonetic: "/bathtub/", meaning: "浴缸", example: "A deep bathtub.", level: "A2" },
  { word: "oven", phonetic: "/oven/", meaning: "烤箱", example: "A gas oven.", level: "A2" },
  { word: "stove", phonetic: "/stove/", meaning: "炉灶", example: "An electric stove.", level: "A2" },
  { word: "microwave", phonetic: "/microwave/", meaning: "微波炉", example: "A microwave oven.", level: "A2" },
  { word: "refrigerator", phonetic: "/refrigerator/", meaning: "冰箱", example: "A large refrigerator.", level: "A2" },
  { word: "dishwasher", phonetic: "/dishwasher/", meaning: "洗碗机", example: "A built-in dishwasher.", level: "A2" },
  { word: "washing machine", phonetic: "/washing machine/", meaning: "洗衣机", example: "An automatic washing machine.", level: "A2" },
  { word: "dryer", phonetic: "/dryer/", meaning: "烘干机", example: "A clothes dryer.", level: "A2" },
  { word: "vacuum", phonetic: "/vacuum/", meaning: "吸尘器", example: "A cordless vacuum.", level: "A2" },
  { word: "subway", phonetic: "/subway/", meaning: "地铁", example: "Take the subway.", level: "A2" },
  { word: "bicycle", phonetic: "/bicycle/", meaning: "自行车", example: "Ride a bicycle.", level: "A2" },
  { word: "motorcycle", phonetic: "/motorcycle/", meaning: "摩托车", example: "A black motorcycle.", level: "A2" },
  { word: "ambulance", phonetic: "/ambulance/", meaning: "救护车", example: "An emergency ambulance.", level: "A2" },
  { word: "fire truck", phonetic: "/fire truck/", meaning: "消防车", example: "A red fire truck.", level: "A2" },
  { word: "helicopter", phonetic: "/helicopter/", meaning: "直升机", example: "A rescue helicopter.", level: "A2" },
  { word: "thunder", phonetic: "/thunder/", meaning: "雷", example: "Loud thunder.", level: "A2" },
  { word: "lightning", phonetic: "/lightning/", meaning: "闪电", example: "Bright lightning.", level: "A2" },
  { word: "fog", phonetic: "/fog/", meaning: "雾", example: "Thick fog.", level: "A2" },
  { word: "ice", phonetic: "/ice/", meaning: "冰", example: "Black ice.", level: "A2" },
  { word: "frost", phonetic: "/frost/", meaning: "霜", example: "Morning frost.", level: "A2" },
  { word: "rainbow", phonetic: "/rainbow/", meaning: "彩虹", example: "A beautiful rainbow.", level: "A2" },
  { word: "forecast", phonetic: "/forecast/", meaning: "预报", example: "Weather forecast.", level: "A2" },
  { word: "climate", phonetic: "/climate/", meaning: "气候", example: "Tropical climate.", level: "A2" },
  { word: "dawn", phonetic: "/dawn/", meaning: "黎明", example: "At dawn.", level: "A2" },
  { word: "dusk", phonetic: "/dusk/", meaning: "黄昏", example: "At dusk.", level: "A2" },
  { word: "midnight", phonetic: "/midnight/", meaning: "午夜", example: "At midnight.", level: "A2" },
  { word: "noon", phonetic: "/noon/", meaning: "中午", example: "At noon.", level: "A2" },
  { word: "decade", phonetic: "/decade/", meaning: "十年", example: "A decade ago.", level: "A2" },
  { word: "era", phonetic: "/era/", meaning: "时代", example: "A new era.", level: "A2" },
  { word: "anniversary", phonetic: "/anniversary/", meaning: "周年", example: "Wedding anniversary.", level: "A2" },
  { word: "vacation", phonetic: "/vacation/", meaning: "假期", example: "Summer vacation.", level: "A2" },
  { word: "schedule", phonetic: "/schedule/", meaning: "日程", example: "A busy schedule.", level: "A2" },
  { word: "calendar", phonetic: "/calendar/", meaning: "日历", example: "Check the calendar.", level: "A2" },
  { word: "deadline", phonetic: "/deadline/", meaning: "截止日期", example: "Meet the deadline.", level: "A2" },
  { word: "argue", phonetic: "/argue/", meaning: "争论", example: "Do not argue.", level: "A2" },
  { word: "disagree", phonetic: "/disagree/", meaning: "不同意", example: "I disagree.", level: "A2" },
  { word: "recommend", phonetic: "/recommend/", meaning: "推荐", example: "I recommend this.", level: "A2" },
  { word: "forgive", phonetic: "/forgive/", meaning: "原谅", example: "Forgive me.", level: "A2" },
  { word: "complain", phonetic: "/complain/", meaning: "抱怨", example: "Do not complain.", level: "A2" },
  { word: "praise", phonetic: "/praise/", meaning: "表扬", example: "Praise good work.", level: "A2" },
  { word: "criticize", phonetic: "/criticize/", meaning: "批评", example: "Do not criticize.", level: "A2" },
  { word: "request", phonetic: "/request/", meaning: "请求", example: "A polite request.", level: "A2" },
  { word: "demand", phonetic: "/demand/", meaning: "要求", example: "A strong demand.", level: "A2" },
  { word: "command", phonetic: "/command/", meaning: "指挥", example: "Command the troops.", level: "A2" },
  { word: "instruction", phonetic: "/instruction/", meaning: "指示", example: "Follow instructions.", level: "A2" },
  { word: "advice", phonetic: "/advice/", meaning: "建议", example: "Good advice.", level: "A2" },
  { word: "suggestion", phonetic: "/suggestion/", meaning: "建议", example: "A helpful suggestion.", level: "A2" },
  { word: "decision", phonetic: "/decision/", meaning: "决定", example: "A wise decision.", level: "A2" },
  { word: "option", phonetic: "/option/", meaning: "选项", example: "A good option.", level: "A2" },
  { word: "possibility", phonetic: "/possibility/", meaning: "可能性", example: "A strong possibility.", level: "A2" },
  { word: "probability", phonetic: "/probability/", meaning: "概率", example: "High probability.", level: "A2" },
  { word: "risk", phonetic: "/risk/", meaning: "风险", example: "A calculated risk.", level: "A2" },
  { word: "solution", phonetic: "/solution/", meaning: "解决方案", example: "A creative solution.", level: "A2" },
  { word: "circumstance", phonetic: "/circumstance/", meaning: "情况", example: "Under the circumstances.", level: "A2" },
  { word: "environment", phonetic: "/environment/", meaning: "环境", example: "A safe environment.", level: "A2" },
  { word: "background", phonetic: "/background/", meaning: "背景", example: "A cultural background.", level: "A2" },
  { word: "tale", phonetic: "/tale/", meaning: "传说", example: "An old tale.", level: "A2" },
  { word: "myth", phonetic: "/myth/", meaning: "神话", example: "A Greek myth.", level: "A2" },
  { word: "legend", phonetic: "/legend/", meaning: "传奇", example: "A local legend.", level: "A2" },
  { word: "mystery", phonetic: "/mystery/", meaning: "谜", example: "An unsolved mystery.", level: "A2" },
  { word: "puzzle", phonetic: "/puzzle/", meaning: "谜题", example: "A jigsaw puzzle.", level: "A2" },
  { word: "riddle", phonetic: "/riddle/", meaning: "谜语", example: "A clever riddle.", level: "A2" },
  { word: "trick", phonetic: "/trick/", meaning: "把戏", example: "A magic trick.", level: "A2" },
  { word: "humor", phonetic: "/humor/", meaning: "幽默", example: "A sense of humor.", level: "A2" },
  { word: "comedy", phonetic: "/comedy/", meaning: "喜剧", example: "A romantic comedy.", level: "A2" },
  { word: "drama", phonetic: "/drama/", meaning: "戏剧", example: "A family drama.", level: "A2" },
  { word: "tragedy", phonetic: "/tragedy/", meaning: "悲剧", example: "A Greek tragedy.", level: "A2" },
  { word: "action", phonetic: "/action/", meaning: "行动", example: "Quick action.", level: "A2" },
  { word: "romance", phonetic: "/romance/", meaning: "浪漫", example: "A love romance.", level: "A2" },
  { word: "fiction", phonetic: "/fiction/", meaning: "小说", example: "Science fiction.", level: "A2" },
  { word: "nonfiction", phonetic: "/nonfiction/", meaning: "非虚构", example: "Historical nonfiction.", level: "A2" },
  { word: "poetry", phonetic: "/poetry/", meaning: "诗歌", example: "Modern poetry.", level: "A2" },
  { word: "novel", phonetic: "/novel/", meaning: "小说", example: "A best-selling novel.", level: "A2" },
  { word: "short story", phonetic: "/short story/", meaning: "短篇", example: "A short story collection.", level: "A2" },
  { word: "essay", phonetic: "/essay/", meaning: "散文", example: "A personal essay.", level: "A2" },
  { word: "summary", phonetic: "/summary/", meaning: "摘要", example: "A brief summary.", level: "A2" },
  { word: "analysis", phonetic: "/analysis/", meaning: "分析", example: "A critical analysis.", level: "A2" },
  { word: "exam", phonetic: "/exam/", meaning: "考试", example: "A final exam.", level: "A2" },
  { word: "quiz", phonetic: "/quiz/", meaning: "小测验", example: "A pop quiz.", level: "A2" },
  { word: "presentation", phonetic: "/presentation/", meaning: "演示", example: "A PowerPoint presentation.", level: "A2" },
  { word: "lecture", phonetic: "/lecture/", meaning: "讲座", example: "A university lecture.", level: "A2" },
  { word: "diploma", phonetic: "/diploma/", meaning: "文凭", example: "A high school diploma.", level: "A2" },
  { word: "certificate", phonetic: "/certificate/", meaning: "证书", example: "A completion certificate.", level: "A2" },
  { word: "qualification", phonetic: "/qualification/", meaning: "资格", example: "A professional qualification.", level: "A2" },
  { word: "talent", phonetic: "/talent/", meaning: "天赋", example: "A natural talent.", level: "A2" },
  { word: "ability", phonetic: "/ability/", meaning: "能力", example: "A special ability.", level: "A2" },
  { word: "weakness", phonetic: "/weakness/", meaning: "弱点", example: "A known weakness.", level: "A2" },
  { word: "disadvantage", phonetic: "/disadvantage/", meaning: "劣势", example: "A major disadvantage.", level: "A2" },
  { word: "benefit", phonetic: "/benefit/", meaning: "好处", example: "A health benefit.", level: "A2" },
  { word: "drawback", phonetic: "/drawback/", meaning: "缺点", example: "A significant drawback.", level: "A2" },
  { word: "characteristic", phonetic: "/characteristic/", meaning: "特征", example: "A unique characteristic.", level: "A2" },
  { word: "expense", phonetic: "/expense/", meaning: "费用", example: "A monthly expense.", level: "A2" },
  { word: "budget", phonetic: "/budget/", meaning: "预算", example: "A tight budget.", level: "A2" },
  { word: "income", phonetic: "/income/", meaning: "收入", example: "A steady income.", level: "A2" },
  { word: "salary", phonetic: "/salary/", meaning: "工资", example: "A monthly salary.", level: "A2" },
  { word: "wage", phonetic: "/wage/", meaning: "工资", example: "An hourly wage.", level: "A2" },
  { word: "profit", phonetic: "/profit/", meaning: "利润", example: "A good profit.", level: "A2" },
  { word: "loss", phonetic: "/loss/", meaning: "损失", example: "A financial loss.", level: "A2" },
  { word: "investment", phonetic: "/investment/", meaning: "投资", example: "A smart investment.", level: "A2" },
  { word: "savings", phonetic: "/savings/", meaning: "储蓄", example: "Life savings.", level: "A2" },
  { word: "debt", phonetic: "/debt/", meaning: "债务", example: "A credit card debt.", level: "A2" },
  { word: "loan", phonetic: "/loan/", meaning: "贷款", example: "A home loan.", level: "A2" },
  { word: "mortgage", phonetic: "/mortgage/", meaning: "抵押", example: "A 30-year mortgage.", level: "A2" },
  { word: "insurance", phonetic: "/insurance/", meaning: "保险", example: "Health insurance.", level: "A2" },
  { word: "tax", phonetic: "/tax/", meaning: "税", example: "Income tax.", level: "A2" },
  { word: "bill", phonetic: "/bill/", meaning: "账单", example: "A monthly bill.", level: "A2" },
  { word: "receipt", phonetic: "/receipt/", meaning: "收据", example: "Keep the receipt.", level: "A2" },
  { word: "cash", phonetic: "/cash/", meaning: "现金", example: "Pay with cash.", level: "A2" },
  { word: "credit card", phonetic: "/credit card/", meaning: "信用卡", example: "A credit card.", level: "A2" },
  { word: "bank account", phonetic: "/bank account/", meaning: "银行账户", example: "A savings account.", level: "A2" },
  { word: "ATM", phonetic: "/ATM/", meaning: "自动取款机", example: "Find an ATM.", level: "A2" },
  { word: "exchange rate", phonetic: "/exchange rate/", meaning: "汇率", example: "The exchange rate.", level: "A2" },
  { word: "stock market", phonetic: "/stock market/", meaning: "股市", example: "The stock market.", level: "A2" },
  { word: "economy", phonetic: "/economy/", meaning: "经济", example: "The global economy.", level: "A2" },
  { word: "corporation", phonetic: "/corporation/", meaning: "集团", example: "A multinational corporation.", level: "A2" },
  { word: "regulation", phonetic: "/regulation/", meaning: "规定", example: "A government regulation.", level: "A2" },
  { word: "policy", phonetic: "/policy/", meaning: "政策", example: "A company policy.", level: "A2" },
  { word: "agreement", phonetic: "/agreement/", meaning: "协议", example: "A signed agreement.", level: "A2" },
  { word: "contract", phonetic: "/contract/", meaning: "合同", example: "A work contract.", level: "A2" },
  { word: "negotiation", phonetic: "/negotiation/", meaning: "谈判", example: "A salary negotiation.", level: "A2" },
  { word: "conference", phonetic: "/conference/", meaning: "会议", example: "A press conference.", level: "A2" },
  { word: "discussion", phonetic: "/discussion/", meaning: "讨论", example: "A group discussion.", level: "A2" },
  { word: "conversation", phonetic: "/conversation/", meaning: "对话", example: "A phone conversation.", level: "A2" },
  { word: "dialogue", phonetic: "/dialogue/", meaning: "对话", example: "A cultural dialogue.", level: "A2" },
  { word: "debate", phonetic: "/debate/", meaning: "辩论", example: "A political debate.", level: "A2" },
  { word: "conflict", phonetic: "/conflict/", meaning: "冲突", example: "A family conflict.", level: "A2" },
  { word: "justice", phonetic: "/justice/", meaning: "正义", example: "Social justice.", level: "A2" },
  { word: "equality", phonetic: "/equality/", meaning: "平等", example: "Gender equality.", level: "A2" },
  { word: "democracy", phonetic: "/democracy/", meaning: "民主", example: "A true democracy.", level: "A2" },
  { word: "religion", phonetic: "/religion/", meaning: "宗教", example: "A major religion.", level: "A2" },
  { word: "custom", phonetic: "/custom/", meaning: "习俗", example: "A national custom.", level: "A2" },
  { word: "belief", phonetic: "/belief/", meaning: "信仰", example: "A strong belief.", level: "A2" },
  { word: "morality", phonetic: "/morality/", meaning: "道德", example: "A question of morality.", level: "A2" },
  { word: "ethics", phonetic: "/ethics/", meaning: "伦理", example: "Business ethics.", level: "A2" },
  { word: "philosophy", phonetic: "/philosophy/", meaning: "哲学", example: "Eastern philosophy.", level: "A2" },
  { word: "engineering", phonetic: "/engineering/", meaning: "工程", example: "Civil engineering.", level: "A2" },
  { word: "mathematics", phonetic: "/mathematics/", meaning: "数学", example: "Applied mathematics.", level: "A2" },
  { word: "chemistry", phonetic: "/chemistry/", meaning: "化学", example: "Organic chemistry.", level: "A2" },
  { word: "biology", phonetic: "/biology/", meaning: "生物", example: "Marine biology.", level: "A2" },
  { word: "geography", phonetic: "/geography/", meaning: "地理", example: "Physical geography.", level: "A2" },
  { word: "geology", phonetic: "/geology/", meaning: "地质", example: "Environmental geology.", level: "A2" },
  { word: "astronomy", phonetic: "/astronomy/", meaning: "天文", example: "Observational astronomy.", level: "A2" },
  { word: "psychology", phonetic: "/psychology/", meaning: "心理学", example: "Clinical psychology.", level: "A2" },
  { word: "sociology", phonetic: "/sociology/", meaning: "社会学", example: "Urban sociology.", level: "A2" },
  { word: "economics", phonetic: "/economics/", meaning: "经济学", example: "Macroeconomics.", level: "A2" },
  { word: "politics", phonetic: "/politics/", meaning: "政治", example: "International politics.", level: "A2" },
  { word: "photography", phonetic: "/photography/", meaning: "摄影", example: "Digital photography.", level: "A2" },
  { word: "literature", phonetic: "/literature/", meaning: "文学", example: "English literature.", level: "A2" },
  { word: "architecture", phonetic: "/architecture/", meaning: "建筑", example: "Modern architecture.", level: "A2" },
  { word: "fashion", phonetic: "/fashion/", meaning: "时尚", example: "High fashion.", level: "A2" },
  { word: "sports", phonetic: "/sports/", meaning: "体育", example: "Team sports.", level: "A2" },
  { word: "fitness", phonetic: "/fitness/", meaning: "健身", example: "Physical fitness.", level: "A2" },
  { word: "nutrition", phonetic: "/nutrition/", meaning: "营养", example: "Sports nutrition.", level: "A2" },
  { word: "cooking", phonetic: "/cooking/", meaning: "烹饪", example: "Italian cooking.", level: "A2" },
  { word: "tourism", phonetic: "/tourism/", meaning: "旅游", example: "Eco-tourism.", level: "A2" },
  { word: "climate change", phonetic: "/climate change/", meaning: "气候变化", example: "Address climate change.", level: "A2" },
  { word: "pollution", phonetic: "/pollution/", meaning: "污染", example: "Air pollution.", level: "A2" },
  { word: "recycling", phonetic: "/recycling/", meaning: "回收", example: "Plastic recycling.", level: "A2" },
  { word: "sustainability", phonetic: "/sustainability/", meaning: "可持续", example: "Environmental sustainability.", level: "A2" },
  { word: "conservation", phonetic: "/conservation/", meaning: "保护", example: "Wildlife conservation.", level: "A2" },
  { word: "ecology", phonetic: "/ecology/", meaning: "生态", example: "Marine ecology.", level: "A2" },
  { word: "biodiversity", phonetic: "/biodiversity/", meaning: "多样性", example: "Biological biodiversity.", level: "A2" },
  { word: "apply", phonetic: "/apply/", meaning: "申请", example: "Apply for the job.", level: "A2" },
  { word: "behave", phonetic: "/behave/", meaning: "表现", example: "Behave yourself.", level: "A2" },
  { word: "belong", phonetic: "/belong/", meaning: "属于", example: "It belongs to me.", level: "A2" },
  { word: "bend", phonetic: "/bend/", meaning: "弯曲", example: "Bend the wire.", level: "A2" },
  { word: "bet", phonetic: "/bet/", meaning: "打赌", example: "I bet you can do it.", level: "A2" },
  { word: "bite", phonetic: "/bite/", meaning: "咬", example: "The dog might bite.", level: "A2" },
  { word: "blame", phonetic: "/blame/", meaning: "责怪", example: "Do not blame others.", level: "A2" },
  { word: "bleed", phonetic: "/bleed/", meaning: "流血", example: "The wound bleeds.", level: "A2" },
  { word: "bless", phonetic: "/bless/", meaning: "保佑", example: "Bless you.", level: "A2" },
  { word: "block", phonetic: "/block/", meaning: "阻塞", example: "Block the road.", level: "A2" },
  { word: "boil", phonetic: "/boil/", meaning: "煮", example: "Boil the water.", level: "A2" },
  { word: "bother", phonetic: "/bother/", meaning: "打扰", example: "Do not bother me.", level: "A2" },
  { word: "bounce", phonetic: "/bounce/", meaning: "弹跳", example: "The ball bounces.", level: "A2" },
  { word: "breathe", phonetic: "/breathe/", meaning: "呼吸", example: "Breathe deeply.", level: "A2" },
  { word: "broadcast", phonetic: "/broadcast/", meaning: "广播", example: "Broadcast the news.", level: "A2" },
  { word: "bury", phonetic: "/bury/", meaning: "埋", example: "Bury the treasure.", level: "A2" },
  { word: "calculate", phonetic: "/calculate/", meaning: "计算", example: "Calculate the total.", level: "A2" },
  { word: "capture", phonetic: "/capture/", meaning: "捕获", example: "Capture the moment.", level: "A2" },
  { word: "challenge", phonetic: "/challenge/", meaning: "挑战", example: "Challenge yourself.", level: "A2" },
  { word: "chase", phonetic: "/chase/", meaning: "追逐", example: "Chase the ball.", level: "A2" },
  { word: "cheat", phonetic: "/cheat/", meaning: "作弊", example: "Do not cheat.", level: "A2" },
  { word: "cheer", phonetic: "/cheer/", meaning: "欢呼", example: "Cheer for the team.", level: "A2" },
  { word: "clap", phonetic: "/clap/", meaning: "鼓掌", example: "Clap your hands.", level: "A2" },
  { word: "click", phonetic: "/click/", meaning: "点击", example: "Click the button.", level: "A2" },
  { word: "combine", phonetic: "/combine/", meaning: "组合", example: "Combine the ingredients.", level: "A2" },
  { word: "comfort", phonetic: "/comfort/", meaning: "安慰", example: "Comfort the child.", level: "A2" },
  { word: "comment", phonetic: "/comment/", meaning: "评论", example: "Comment on the post.", level: "A2" },
  { word: "commit", phonetic: "/commit/", meaning: "犯（错）", example: "Commit a mistake.", level: "A2" },
  { word: "communicate", phonetic: "/communicate/", meaning: "沟通", example: "Communicate clearly.", level: "A2" },
  { word: "confuse", phonetic: "/confuse/", meaning: "使困惑", example: "Do not confuse me.", level: "A2" },
  { word: "crush", phonetic: "/crush/", meaning: "压碎", example: "Crush the garlic.", level: "A2" },
  { word: "cure", phonetic: "/cure/", meaning: "治愈", example: "Cure the disease.", level: "A2" },
  { word: "dare", phonetic: "/dare/", meaning: "敢", example: "I dare you.", level: "A2" },
  { word: "declare", phonetic: "/declare/", meaning: "宣布", example: "Declare the winner.", level: "A2" },
  { word: "decorate", phonetic: "/decorate/", meaning: "装饰", example: "Decorate the room.", level: "A2" },
  { word: "defeat", phonetic: "/defeat/", meaning: "打败", example: "Defeat the enemy.", level: "A2" },
  { word: "defend", phonetic: "/defend/", meaning: "保卫", example: "Defend your country.", level: "A2" },
  { word: "define", phonetic: "/define/", meaning: "定义", example: "Define the word.", level: "A2" },
  { word: "delay", phonetic: "/delay/", meaning: "延迟", example: "Delay the flight.", level: "A2" },
  { word: "deliver", phonetic: "/deliver/", meaning: "递送", example: "Deliver the package.", level: "A2" },
  { word: "deny", phonetic: "/deny/", meaning: "否认", example: "Deny the accusation.", level: "A2" },
  { word: "deserve", phonetic: "/deserve/", meaning: "值得", example: "You deserve it.", level: "A2" },
  { word: "destroy", phonetic: "/destroy/", meaning: "摧毁", example: "Destroy the evidence.", level: "A2" },
  { word: "detect", phonetic: "/detect/", meaning: "发现", example: "Detect the problem.", level: "A2" },
  { word: "disappear", phonetic: "/disappear/", meaning: "消失", example: "The magic disappears.", level: "A2" },
  { word: "dismiss", phonetic: "/dismiss/", meaning: "解雇", example: "Dismiss the employee.", level: "A2" },
  { word: "display", phonetic: "/display/", meaning: "展示", example: "Display the artwork.", level: "A2" },
  { word: "distribute", phonetic: "/distribute/", meaning: "分配", example: "Distribute the food.", level: "A2" },
  { word: "donate", phonetic: "/donate/", meaning: "捐赠", example: "Donate to charity.", level: "A2" },
  { word: "download", phonetic: "/download/", meaning: "下载", example: "Download the file.", level: "A2" },
  { word: "drag", phonetic: "/drag/", meaning: "拖", example: "Drag the chair.", level: "A2" },
  { word: "educate", phonetic: "/educate/", meaning: "教育", example: "Educate the public.", level: "A2" },
  { word: "elect", phonetic: "/elect/", meaning: "选举", example: "Elect a leader.", level: "A2" },
  { word: "embarrass", phonetic: "/embarrass/", meaning: "使尴尬", example: "Do not embarrass me.", level: "A2" },
  { word: "emerge", phonetic: "/emerge/", meaning: "出现", example: "The sun emerged.", level: "A2" },
  { word: "employ", phonetic: "/employ/", meaning: "雇用", example: "Employ new staff.", level: "A2" },
  { word: "enable", phonetic: "/enable/", meaning: "使能够", example: "Enable the feature.", level: "A2" },
  { word: "excite", phonetic: "/excite/", meaning: "使兴奋", example: "The news excites me.", level: "A2" },
  { word: "exclude", phonetic: "/exclude/", meaning: "排除", example: "Exclude the outliers.", level: "A2" },
  { word: "execute", phonetic: "/execute/", meaning: "执行", example: "Execute the plan.", level: "A2" },
  { word: "expand", phonetic: "/expand/", meaning: "扩展", example: "Expand your horizons.", level: "A2" },
  { word: "explore", phonetic: "/explore/", meaning: "探索", example: "Explore the world.", level: "A2" },
  { word: "export", phonetic: "/export/", meaning: "出口", example: "Export the goods.", level: "A2" },
  { word: "expose", phonetic: "/expose/", meaning: "暴露", example: "Expose the truth.", level: "A2" },
  { word: "extend", phonetic: "/extend/", meaning: "延伸", example: "Extend the deadline.", level: "A2" },
  { word: "fade", phonetic: "/fade/", meaning: "褪色", example: "Colors fade.", level: "A2" },
  { word: "fancy", phonetic: "/fancy/", meaning: "喜欢", example: "I fancy that.", level: "A2" },
  { word: "flash", phonetic: "/flash/", meaning: "闪光", example: "Lightning flashes.", level: "A2" },
  { word: "float", phonetic: "/float/", meaning: "漂浮", example: "Wood floats.", level: "A2" },
  { word: "flow", phonetic: "/flow/", meaning: "流动", example: "Water flows.", level: "A2" },
  { word: "fold", phonetic: "/fold/", meaning: "折叠", example: "Fold the paper.", level: "A2" },
  { word: "found", phonetic: "/found/", meaning: "成立", example: "Found a company.", level: "A2" },
  { word: "freeze", phonetic: "/freeze/", meaning: "冻结", example: "Water freezes.", level: "A2" },
  { word: "frighten", phonetic: "/frighten/", meaning: "吓唬", example: "Do not frighten children.", level: "A2" },
  { word: "generate", phonetic: "/generate/", meaning: "发电", example: "Generate power.", level: "A2" },
  { word: "glow", phonetic: "/glow/", meaning: "发光", example: "The fire glows.", level: "A2" },
  { word: "govern", phonetic: "/govern/", meaning: "统治", example: "Govern wisely.", level: "A2" },
  { word: "grab", phonetic: "/grab/", meaning: "抓住", example: "Grab the handle.", level: "A2" },
  { word: "graduate", phonetic: "/graduate/", meaning: "毕业", example: "Graduate from college.", level: "A2" },
  { word: "grant", phonetic: "/grant/", meaning: "授予", example: "Grant a wish.", level: "A2" },
  { word: "grasp", phonetic: "/grasp/", meaning: "抓住", example: "Grasp the concept.", level: "A2" },
  { word: "handle", phonetic: "/handle/", meaning: "处理", example: "Handle with care.", level: "A2" },
  { word: "hang", phonetic: "/hang/", meaning: "挂", example: "Hang the picture.", level: "A2" },
  { word: "harm", phonetic: "/harm/", meaning: "伤害", example: "Do not harm others.", level: "A2" },
  { word: "heal", phonetic: "/heal/", meaning: "治愈", example: "Time heals.", level: "A2" },
  { word: "honor", phonetic: "/honor/", meaning: "尊敬", example: "Honor your parents.", level: "A2" },
  { word: "import", phonetic: "/import/", meaning: "进口", example: "Import the goods.", level: "A2" },
  { word: "impress", phonetic: "/impress/", meaning: "留下印象", example: "Impress the audience.", level: "A2" },
  { word: "inherit", phonetic: "/inherit/", meaning: "继承", example: "Inherit the property.", level: "A2" },
  { word: "injure", phonetic: "/injure/", meaning: "受伤", example: "Injure yourself.", level: "A2" },
  { word: "insert", phonetic: "/insert/", meaning: "插入", example: "Insert the key.", level: "A2" },
  { word: "inspect", phonetic: "/inspect/", meaning: "检查", example: "Inspect the building.", level: "A2" },
  { word: "inspire", phonetic: "/inspire/", meaning: "启发", example: "Inspire others.", level: "A2" },
  { word: "install", phonetic: "/install/", meaning: "安装", example: "Install the software.", level: "A2" },
  { word: "instruct", phonetic: "/instruct/", meaning: "指导", example: "Instruct the students.", level: "A2" },
  { word: "insure", phonetic: "/insure/", meaning: "保险", example: "Insure your car.", level: "A2" },
  { word: "integrate", phonetic: "/integrate/", meaning: "整合", example: "Integrate the systems.", level: "A2" },
  { word: "intend", phonetic: "/intend/", meaning: "打算", example: "I intend to go.", level: "A2" },
  { word: "interrupt", phonetic: "/interrupt/", meaning: "打断", example: "Do not interrupt.", level: "A2" },
  { word: "investigate", phonetic: "/investigate/", meaning: "调查", example: "Investigate the crime.", level: "A2" },
  { word: "involve", phonetic: "/involve/", meaning: "涉及", example: "Involve everyone.", level: "A2" },
  { word: "isolate", phonetic: "/isolate/", meaning: "隔离", example: "Isolate the problem.", level: "A2" },
  { word: "justify", phonetic: "/justify/", meaning: "证明", example: "Justify your actions.", level: "A2" },
  { word: "kick", phonetic: "/kick/", meaning: "踢", example: "Kick the ball.", level: "A2" },
  { word: "kiss", phonetic: "/kiss/", meaning: "亲吻", example: "Kiss the baby.", level: "A2" },
  { word: "launch", phonetic: "/launch/", meaning: "发射", example: "Launch the rocket.", level: "A2" },
  { word: "lean", phonetic: "/lean/", meaning: "倾斜", example: "Lean forward.", level: "A2" },
  { word: "leap", phonetic: "/leap/", meaning: "跳跃", example: "Leap over it.", level: "A2" },
  { word: "link", phonetic: "/link/", meaning: "连接", example: "Link the pages.", level: "A2" },
  { word: "load", phonetic: "/load/", meaning: "装载", example: "Load the truck.", level: "A2" },
  { word: "maintain", phonetic: "/maintain/", meaning: "维护", example: "Maintain the car.", level: "A2" },
  { word: "mark", phonetic: "/mark/", meaning: "标记", example: "Mark the date.", level: "A2" },
  { word: "match", phonetic: "/match/", meaning: "匹配", example: "Match the colors.", level: "A2" },
  { word: "melt", phonetic: "/melt/", meaning: "融化", example: "Ice melts.", level: "A2" },
  { word: "multiply", phonetic: "/multiply/", meaning: "乘", example: "Multiply by two.", level: "A2" },
  { word: "murder", phonetic: "/murder/", meaning: "谋杀", example: "Murder is a crime.", level: "A2" },
  { word: "negotiate", phonetic: "/negotiate/", meaning: "谈判", example: "Negotiate the price.", level: "A2" },
  { word: "obey", phonetic: "/obey/", meaning: "服从", example: "Obey the rules.", level: "A2" },
  { word: "observe", phonetic: "/observe/", meaning: "观察", example: "Observe the stars.", level: "A2" },
  { word: "obtain", phonetic: "/obtain/", meaning: "获得", example: "Obtain permission.", level: "A2" },
  { word: "operate", phonetic: "/operate/", meaning: "操作", example: "Operate the machine.", level: "A2" },
  { word: "oppose", phonetic: "/oppose/", meaning: "反对", example: "Oppose the plan.", level: "A2" },
  { word: "organize", phonetic: "/organize/", meaning: "组织", example: "Organize the event.", level: "A2" },
  { word: "owe", phonetic: "/owe/", meaning: "欠", example: "I owe you.", level: "A2" },
  { word: "perform", phonetic: "/perform/", meaning: "表演", example: "Perform on stage.", level: "A2" },
  { word: "permit", phonetic: "/permit/", meaning: "允许", example: "Permit entry.", level: "A2" },
  { word: "polish", phonetic: "/polish/", meaning: "擦亮", example: "Polish the shoes.", level: "A2" },
  { word: "pollute", phonetic: "/pollute/", meaning: "污染", example: "Pollute the air.", level: "A2" },
  { word: "possess", phonetic: "/possess/", meaning: "拥有", example: "Possess knowledge.", level: "A2" },
  { word: "predict", phonetic: "/predict/", meaning: "预测", example: "Predict the future.", level: "A2" },
  { word: "preserve", phonetic: "/preserve/", meaning: "保存", example: "Preserve the evidence.", level: "A2" },
  { word: "promote", phonetic: "/promote/", meaning: "推广", example: "Promote the product.", level: "A2" },
  { word: "publish", phonetic: "/publish/", meaning: "出版", example: "Publish the book.", level: "A2" },
  { word: "qualify", phonetic: "/qualify/", meaning: "有资格", example: "Qualify for the race.", level: "A2" },
  { word: "quit", phonetic: "/quit/", meaning: "辞职", example: "Quit the job.", level: "A2" },
  { word: "quote", phonetic: "/quote/", meaning: "引用", example: "Quote the author.", level: "A2" },
  { word: "recover", phonetic: "/recover/", meaning: "恢复", example: "Recover from illness.", level: "A2" },
  { word: "recycle", phonetic: "/recycle/", meaning: "回收", example: "Recycle plastic.", level: "A2" },
  { word: "reflect", phonetic: "/reflect/", meaning: "反映", example: "Reflect the light.", level: "A2" },
  { word: "register", phonetic: "/register/", meaning: "注册", example: "Register online.", level: "A2" },
  { word: "regret", phonetic: "/regret/", meaning: "后悔", example: "Regret the decision.", level: "A2" },
  { word: "reject", phonetic: "/reject/", meaning: "拒绝", example: "Reject the proposal.", level: "A2" },
  { word: "relax", phonetic: "/relax/", meaning: "放松", example: "Relax and rest.", level: "A2" },
  { word: "release", phonetic: "/release/", meaning: "释放", example: "Release the balloon.", level: "A2" },
  { word: "rely", phonetic: "/rely/", meaning: "依赖", example: "Rely on yourself.", level: "A2" },
  { word: "renew", phonetic: "/renew/", meaning: "续借", example: "Renew the license.", level: "A2" },
  { word: "rescue", phonetic: "/rescue/", meaning: "营救", example: "Rescue the victim.", level: "A2" },
  { word: "reserve", phonetic: "/reserve/", meaning: "预订", example: "Reserve a table.", level: "A2" },
  { word: "resign", phonetic: "/resign/", meaning: "辞职", example: "Resign from the position.", level: "A2" },
  { word: "resist", phonetic: "/resist/", meaning: "抵抗", example: "Resist the temptation.", level: "A2" },
  { word: "resolve", phonetic: "/resolve/", meaning: "解决", example: "Resolve the conflict.", level: "A2" },
  { word: "respond", phonetic: "/respond/", meaning: "回应", example: "Respond to the message.", level: "A2" },
  { word: "restore", phonetic: "/restore/", meaning: "恢复", example: "Restore the painting.", level: "A2" },
  { word: "restrict", phonetic: "/restrict/", meaning: "限制", example: "Restrict access.", level: "A2" },
  { word: "retain", phonetic: "/retain/", meaning: "保留", example: "Retain the information.", level: "A2" },
  { word: "retire", phonetic: "/retire/", meaning: "退休", example: "Retire from work.", level: "A2" },
  { word: "roll", phonetic: "/roll/", meaning: "滚动", example: "Roll the dice.", level: "A2" },
  { word: "sacrifice", phonetic: "/sacrifice/", meaning: "牺牲", example: "Sacrifice for others.", level: "A2" },
  { word: "secure", phonetic: "/secure/", meaning: "保护", example: "Secure the area.", level: "A2" },
  { word: "seek", phonetic: "/seek/", meaning: "寻找", example: "Seek the truth.", level: "A2" },
  { word: "select", phonetic: "/select/", meaning: "选择", example: "Select the best.", level: "A2" },
  { word: "settle", phonetic: "/settle/", meaning: "定居", example: "Settle down.", level: "A2" },
  { word: "shave", phonetic: "/shave/", meaning: "刮脸", example: "Shave the beard.", level: "A2" },
  { word: "shrink", phonetic: "/shrink/", meaning: "缩小", example: "Clothes shrink.", level: "A2" },
  { word: "signal", phonetic: "/signal/", meaning: "发信号", example: "Signal for help.", level: "A2" },
  { word: "slide", phonetic: "/slide/", meaning: "滑动", example: "Slide the door.", level: "A2" },
  { word: "slip", phonetic: "/slip/", meaning: "滑倒", example: "Slip on ice.", level: "A2" },
  { word: "spare", phonetic: "/spare/", meaning: "抽出", example: "Spare some time.", level: "A2" },
  { word: "squeeze", phonetic: "/squeeze/", meaning: "挤", example: "Squeeze the lemon.", level: "A2" },
  { word: "stretch", phonetic: "/stretch/", meaning: "伸展", example: "Stretch your legs.", level: "A2" },
  { word: "struggle", phonetic: "/struggle/", meaning: "挣扎", example: "Struggle for freedom.", level: "A2" },
  { word: "submit", phonetic: "/submit/", meaning: "提交", example: "Submit the form.", level: "A2" },
  { word: "succeed", phonetic: "/succeed/", meaning: "成功", example: "Succeed in life.", level: "A2" },
  { word: "surround", phonetic: "/surround/", meaning: "包围", example: "Surround the area.", level: "A2" },
  { word: "survive", phonetic: "/survive/", meaning: "生存", example: "Survive the storm.", level: "A2" },
  { word: "suspect", phonetic: "/suspect/", meaning: "怀疑", example: "Suspect the truth.", level: "A2" },
  { word: "swallow", phonetic: "/swallow/", meaning: "吞咽", example: "Swallow the pill.", level: "A2" },
  { word: "swear", phonetic: "/swear/", meaning: "发誓", example: "Swear to tell the truth.", level: "A2" },
  { word: "sweep", phonetic: "/sweep/", meaning: "扫地", example: "Sweep the floor.", level: "A2" },
  { word: "swing", phonetic: "/swing/", meaning: "摆动", example: "Swing the bat.", level: "A2" },
  { word: "tear", phonetic: "/tear/", meaning: "撕", example: "Tear the paper.", level: "A2" },
  { word: "threaten", phonetic: "/threaten/", meaning: "威胁", example: "Threaten no one.", level: "A2" },
  { word: "translate", phonetic: "/translate/", meaning: "翻译", example: "Translate the text.", level: "A2" },
  { word: "transport", phonetic: "/transport/", meaning: "运输", example: "Transport the goods.", level: "A2" },
  { word: "trigger", phonetic: "/trigger/", meaning: "触发", example: "Trigger the alarm.", level: "A2" },
  { word: "unite", phonetic: "/unite/", meaning: "联合", example: "Unite the people.", level: "A2" },
  { word: "update", phonetic: "/update/", meaning: "更新", example: "Update the software.", level: "A2" },
  { word: "urge", phonetic: "/urge/", meaning: "催促", example: "Urgent action needed.", level: "A2" },
  { word: "vary", phonetic: "/vary/", meaning: "变化", example: "Prices vary.", level: "A2" },
  { word: "vote", phonetic: "/vote/", meaning: "投票", example: "Vote for change.", level: "A2" },
  { word: "wander", phonetic: "/wander/", meaning: "漫游", example: "Wander the streets.", level: "A2" },
  { word: "whisper", phonetic: "/whisper/", meaning: "低语", example: "Whisper the secret.", level: "A2" },
  { word: "cow", phonetic: "/cow/", meaning: "牛", example: "A dairy cow.", level: "A1" },
  { word: "goat", phonetic: "/goat/", meaning: "山羊", example: "A mountain goat.", level: "A1" },
  { word: "duck", phonetic: "/duck/", meaning: "鸭子", example: "A white duck.", level: "A1" },
  { word: "rabbit", phonetic: "/rabbit/", meaning: "兔子", example: "A fluffy rabbit.", level: "A1" },
  { word: "mouse", phonetic: "/mouse/", meaning: "老鼠", example: "A tiny mouse.", level: "A1" },
  { word: "rat", phonetic: "/rat/", meaning: "大鼠", example: "A city rat.", level: "A1" },
  { word: "snake", phonetic: "/snake/", meaning: "蛇", example: "A green snake.", level: "A1" },
  { word: "frog", phonetic: "/frog/", meaning: "青蛙", example: "A jumping frog.", level: "A1" },
  { word: "turtle", phonetic: "/turtle/", meaning: "乌龟", example: "A slow turtle.", level: "A1" },
  { word: "monkey", phonetic: "/monkey/", meaning: "猴子", example: "A playful monkey.", level: "A1" },
  { word: "lion", phonetic: "/lion/", meaning: "狮子", example: "The king of lions.", level: "A1" },
  { word: "tiger", phonetic: "/tiger/", meaning: "老虎", example: "A Bengal tiger.", level: "A1" },
  { word: "wolf", phonetic: "/wolf/", meaning: "狼", example: "A gray wolf.", level: "A1" },
  { word: "fox", phonetic: "/fox/", meaning: "狐狸", example: "A clever fox.", level: "A1" },
  { word: "deer", phonetic: "/deer/", meaning: "鹿", example: "A graceful deer.", level: "A1" },
  { word: "giraffe", phonetic: "/giraffe/", meaning: "长颈鹿", example: "A tall giraffe.", level: "A1" },
  { word: "zebra", phonetic: "/zebra/", meaning: "斑马", example: "A striped zebra.", level: "A1" },
  { word: "kangaroo", phonetic: "/kangaroo/", meaning: "袋鼠", example: "An Australian kangaroo.", level: "A1" },
  { word: "panda", phonetic: "/panda/", meaning: "熊猫", example: "A giant panda.", level: "A1" },
  { word: "whale", phonetic: "/whale/", meaning: "鲸鱼", example: "A blue whale.", level: "A1" },
  { word: "dolphin", phonetic: "/dolphin/", meaning: "海豚", example: "A playful dolphin.", level: "A1" },
  { word: "shark", phonetic: "/shark/", meaning: "鲨鱼", example: "A great white shark.", level: "A1" },
  { word: "eagle", phonetic: "/eagle/", meaning: "鹰", example: "A bald eagle.", level: "A1" },
  { word: "owl", phonetic: "/owl/", meaning: "猫头鹰", example: "A wise owl.", level: "A1" },
  { word: "parrot", phonetic: "/parrot/", meaning: "鹦鹉", example: "A colorful parrot.", level: "A1" },
  { word: "penguin", phonetic: "/penguin/", meaning: "企鹅", example: "An emperor penguin.", level: "A1" },
  { word: "ant", phonetic: "/ant/", meaning: "蚂蚁", example: "A busy ant.", level: "A1" },
  { word: "bee", phonetic: "/bee/", meaning: "蜜蜂", example: "A honey bee.", level: "A1" },
  { word: "butterfly", phonetic: "/butterfly/", meaning: "蝴蝶", example: "A beautiful butterfly.", level: "A1" },
  { word: "spider", phonetic: "/spider/", meaning: "蜘蛛", example: "A web-spinning spider.", level: "A1" },
  { word: "mosquito", phonetic: "/mosquito/", meaning: "蚊子", example: "A buzzing mosquito.", level: "A1" },
  { word: "valley", phonetic: "/valley/", meaning: "山谷", example: "A deep valley.", level: "A1" },
  { word: "lake", phonetic: "/lake/", meaning: "湖", example: "A calm lake.", level: "A1" },
  { word: "jungle", phonetic: "/jungle/", meaning: "丛林", example: "A tropical jungle.", level: "A1" },
  { word: "desert", phonetic: "/desert/", meaning: "沙漠", example: "A hot desert.", level: "A1" },
  { word: "plain", phonetic: "/plain/", meaning: "平原", example: "A vast plain.", level: "A1" },
  { word: "cliff", phonetic: "/cliff/", meaning: "悬崖", example: "A steep cliff.", level: "A1" },
  { word: "cave", phonetic: "/cave/", meaning: "洞穴", example: "A dark cave.", level: "A1" },
  { word: "waterfall", phonetic: "/waterfall/", meaning: "瀑布", example: "A tall waterfall.", level: "A1" },
  { word: "volcano", phonetic: "/volcano/", meaning: "火山", example: "An active volcano.", level: "A1" },
  { word: "earthquake", phonetic: "/earthquake/", meaning: "地震", example: "A strong earthquake.", level: "A1" },
  { word: "flood", phonetic: "/flood/", meaning: "洪水", example: "A major flood.", level: "A1" },
  { word: "drought", phonetic: "/drought/", meaning: "干旱", example: "A severe drought.", level: "A1" },
  { word: "hurricane", phonetic: "/hurricane/", meaning: "飓风", example: "A category 5 hurricane.", level: "A1" },
  { word: "tornado", phonetic: "/tornado/", meaning: "龙卷风", example: "A violent tornado.", level: "A1" },
  { word: "tsunami", phonetic: "/tsunami/", meaning: "海啸", example: "A massive tsunami.", level: "A1" },
  { word: "headache", phonetic: "/headache/", meaning: "头痛", example: "A bad headache.", level: "A1" },
  { word: "fever", phonetic: "/fever/", meaning: "发烧", example: "A high fever.", level: "A1" },
  { word: "cough", phonetic: "/cough/", meaning: "咳嗽", example: "A dry cough.", level: "A1" },
  { word: "allergy", phonetic: "/allergy/", meaning: "过敏", example: "A pollen allergy.", level: "A1" },
  { word: "infection", phonetic: "/infection/", meaning: "感染", example: "A bacterial infection.", level: "A1" },
  { word: "injury", phonetic: "/injury/", meaning: "受伤", example: "A sports injury.", level: "A1" },
  { word: "broken bone", phonetic: "/broken bone/", meaning: "骨折", example: "A broken arm.", level: "A1" },
  { word: "surgery", phonetic: "/surgery/", meaning: "手术", example: "Heart surgery.", level: "A1" },
  { word: "treatment", phonetic: "/treatment/", meaning: "治疗", example: "Medical treatment.", level: "A1" },
  { word: "prescription", phonetic: "/prescription/", meaning: "处方", example: "A doctor's prescription.", level: "A1" },
  { word: "pill", phonetic: "/pill/", meaning: "药丸", example: "A pain relief pill.", level: "A1" },
  { word: "vaccine", phonetic: "/vaccine/", meaning: "疫苗", example: "A flu vaccine.", level: "A1" },
  { word: "checkup", phonetic: "/checkup/", meaning: "体检", example: "An annual checkup.", level: "A1" },
  { word: "principal", phonetic: "/principal/", meaning: "校长", example: "The school principal.", level: "A1" },
  { word: "classmate", phonetic: "/classmate/", meaning: "同学", example: "A childhood classmate.", level: "A1" },
  { word: "homework", phonetic: "/homework/", meaning: "作业", example: "Math homework.", level: "A1" },
  { word: "score", phonetic: "/score/", meaning: "分数", example: "A perfect score.", level: "A1" },
  { word: "scholarship", phonetic: "/scholarship/", meaning: "奖学金", example: "A full scholarship.", level: "A1" },
  { word: "tuition", phonetic: "/tuition/", meaning: "学费", example: "College tuition.", level: "A1" },
  { word: "textbook", phonetic: "/textbook/", meaning: "教科书", example: "A history textbook.", level: "A1" },
  { word: "notebook", phonetic: "/notebook/", meaning: "笔记本", example: "A spiral notebook.", level: "A1" },
  { word: "calculator", phonetic: "/calculator/", meaning: "计算器", example: "A scientific calculator.", level: "A1" },
  { word: "blackboard", phonetic: "/blackboard/", meaning: "黑板", example: "Write on the blackboard.", level: "A1" },
  { word: "playground", phonetic: "/playground/", meaning: "操场", example: "The school playground.", level: "A1" },
  { word: "gymnasium", phonetic: "/gymnasium/", meaning: "体育馆", example: "The school gymnasium.", level: "A1" },
  { word: "laboratory", phonetic: "/laboratory/", meaning: "实验室", example: "A science laboratory.", level: "A1" },
  { word: "cafeteria", phonetic: "/cafeteria/", meaning: "食堂", example: "The school cafeteria.", level: "A1" },
  { word: "career", phonetic: "/career/", meaning: "职业", example: "A successful career.", level: "A1" },
  { word: "profession", phonetic: "/profession/", meaning: "职业", example: "A respected profession.", level: "A1" },
  { word: "occupation", phonetic: "/occupation/", meaning: "职业", example: "A dangerous occupation.", level: "A1" },
  { word: "employee", phonetic: "/employee/", meaning: "员工", example: "A new employee.", level: "A1" },
  { word: "employer", phonetic: "/employer/", meaning: "雇主", example: "A fair employer.", level: "A1" },
  { word: "colleague", phonetic: "/colleague/", meaning: "同事", example: "A helpful colleague.", level: "A1" },
  { word: "client", phonetic: "/client/", meaning: "客户", example: "A satisfied client.", level: "A1" },
  { word: "resume", phonetic: "/resume/", meaning: "简历", example: "An impressive resume.", level: "A1" },
  { word: "promotion", phonetic: "/promotion/", meaning: "晋升", example: "A well-deserved promotion.", level: "A1" },
  { word: "bonus", phonetic: "/bonus/", meaning: "奖金", example: "A year-end bonus.", level: "A1" },
  { word: "overtime", phonetic: "/overtime/", meaning: "加班", example: "Unpaid overtime.", level: "A1" },
  { word: "retirement", phonetic: "/retirement/", meaning: "退休", example: "Early retirement.", level: "A1" },
  { word: "task", phonetic: "/task/", meaning: "任务", example: "A daily task.", level: "A1" },
  { word: "responsibility", phonetic: "/responsibility/", meaning: "责任", example: "A big responsibility.", level: "A1" },
  { word: "happiness", phonetic: "/happiness/", meaning: "快乐", example: "True happiness.", level: "A1" },
  { word: "sadness", phonetic: "/sadness/", meaning: "悲伤", example: "Deep sadness.", level: "A1" },
  { word: "anger", phonetic: "/anger/", meaning: "愤怒", example: "Control your anger.", level: "A1" },
  { word: "sorrow", phonetic: "/sorrow/", meaning: "悲伤", example: "Deep sorrow.", level: "A1" },
  { word: "disappointment", phonetic: "/disappointment/", meaning: "失望", example: "A great disappointment.", level: "A1" },
  { word: "excitement", phonetic: "/excitement/", meaning: "兴奋", example: "Childhood excitement.", level: "A1" },
  { word: "depression", phonetic: "/depression/", meaning: "抑郁", example: "Clinical depression.", level: "A1" },
  { word: "stress", phonetic: "/stress/", meaning: "压力", example: "Work-related stress.", level: "A1" },
  { word: "loneliness", phonetic: "/loneliness/", meaning: "孤独", example: "Urban loneliness.", level: "A1" },
  { word: "jealousy", phonetic: "/jealousy/", meaning: "嫉妒", example: "Sibling jealousy.", level: "A1" },
  { word: "shame", phonetic: "/shame/", meaning: "羞耻", example: "A feeling of shame.", level: "A1" },
  { word: "guilt", phonetic: "/guilt/", meaning: "内疚", example: "A guilty conscience.", level: "A1" },
  { word: "envy", phonetic: "/envy/", meaning: "羡慕", example: "A touch of envy.", level: "A1" },
  { word: "gratitude", phonetic: "/gratitude/", meaning: "感激", example: "Express your gratitude.", level: "A1" },
  { word: "sympathy", phonetic: "/sympathy/", meaning: "同情", example: "A show of sympathy.", level: "A1" },
  { word: "empathy", phonetic: "/empathy/", meaning: "共情", example: "A lack of empathy.", level: "A1" },
  { word: "confidence", phonetic: "/confidence/", meaning: "信心", example: "Self-confidence.", level: "A1" },
  { word: "patience", phonetic: "/patience/", meaning: "耐心", example: "A test of patience.", level: "A1" },
  { word: "imagination", phonetic: "/imagination/", meaning: "想象力", example: "A vivid imagination.", level: "A1" },
  { word: "creativity", phonetic: "/creativity/", meaning: "创造力", example: "Artistic creativity.", level: "A1" },
  { word: "inspiration", phonetic: "/inspiration/", meaning: "灵感", example: "A source of inspiration.", level: "A1" },
  { word: "motivation", phonetic: "/motivation/", meaning: "动力", example: "Inner motivation.", level: "A1" },
  { word: "determination", phonetic: "/determination/", meaning: "决心", example: "Strong determination.", level: "A1" },
  { word: "passion", phonetic: "/passion/", meaning: "热情", example: "A lifelong passion.", level: "A1" },
  { word: "enthusiasm", phonetic: "/enthusiasm/", meaning: "热情", example: "Youthful enthusiasm.", level: "A1" },
  { word: "beauty", phonetic: "/beauty/", meaning: "美", example: "Natural beauty.", level: "A1" },
  { word: "ugliness", phonetic: "/ugliness/", meaning: "丑陋", example: "Inner ugliness.", level: "A1" },
  { word: "wisdom", phonetic: "/wisdom/", meaning: "智慧", example: "Ancient wisdom.", level: "A1" },
  { word: "ignorance", phonetic: "/ignorance/", meaning: "无知", example: "Blissful ignorance.", level: "A1" },
  { word: "failure", phonetic: "/failure/", meaning: "失败", example: "A learning failure.", level: "A1" },
  { word: "fate", phonetic: "/fate/", meaning: "命运", example: "Accept your fate.", level: "A1" },
  { word: "destiny", phonetic: "/destiny/", meaning: "命运", example: "A greater destiny.", level: "A1" },
  { word: "impossibility", phonetic: "/impossibility/", meaning: "不可能", example: "An impossibility.", level: "A1" },
  { word: "reality", phonetic: "/reality/", meaning: "现实", example: "Harsh reality.", level: "A1" },
  { word: "nightmare", phonetic: "/nightmare/", meaning: "噩梦", example: "A recurring nightmare.", level: "A1" },
  { word: "despair", phonetic: "/despair/", meaning: "绝望", example: "A sense of despair.", level: "A1" },
  { word: "faith", phonetic: "/faith/", meaning: "信仰", example: "A strong faith.", level: "A1" },
  { word: "betrayal", phonetic: "/betrayal/", meaning: "背叛", example: "A deep betrayal.", level: "A1" },
  { word: "loyalty", phonetic: "/loyalty/", meaning: "忠诚", example: "Unwavering loyalty.", level: "A1" },
  { word: "dishonor", phonetic: "/dishonor/", meaning: "耻辱", example: "A mark of dishonor.", level: "A1" },
  { word: "glory", phonetic: "/glory/", meaning: "荣耀", example: "A moment of glory.", level: "A1" },
  { word: "obstacle", phonetic: "/obstacle/", meaning: "障碍", example: "Overcome the obstacle.", level: "A1" },
  { word: "barrier", phonetic: "/barrier/", meaning: "障碍", example: "A language barrier.", level: "A1" },
  { word: "boundary", phonetic: "/boundary/", meaning: "边界", example: "A clear boundary.", level: "A1" },
  { word: "border", phonetic: "/border/", meaning: "国界", example: "A national border.", level: "A1" },
  { word: "beginning", phonetic: "/beginning/", meaning: "开始", example: "A new beginning.", level: "A1" },
  { word: "origin", phonetic: "/origin/", meaning: "起源", example: "The origin of life.", level: "A1" },
  { word: "source", phonetic: "/source/", meaning: "来源", example: "A reliable source.", level: "A1" },
  { word: "impact", phonetic: "/impact/", meaning: "影响", example: "A significant impact.", level: "A1" },
  { word: "development", phonetic: "/development/", meaning: "发展", example: "Economic development.", level: "A1" },
  { word: "growth", phonetic: "/growth/", meaning: "增长", example: "Personal growth.", level: "A1" },
  { word: "decline", phonetic: "/decline/", meaning: "下降", example: "A gradual decline.", level: "A1" },
  { word: "decrease", phonetic: "/decrease/", meaning: "减少", example: "A sharp decrease.", level: "A1" },
  { word: "improvement", phonetic: "/improvement/", meaning: "改善", example: "A marked improvement.", level: "A1" },
  { word: "deterioration", phonetic: "/deterioration/", meaning: "恶化", example: "A rapid deterioration.", level: "A1" },
  { word: "stability", phonetic: "/stability/", meaning: "稳定", example: "Economic stability.", level: "A1" },
  { word: "instability", phonetic: "/instability/", meaning: "不稳定", example: "Political instability.", level: "A1" },
  { word: "security", phonetic: "/security/", meaning: "安全", example: "National security.", level: "A1" },
  { word: "safety", phonetic: "/safety/", meaning: "安全", example: "Public safety.", level: "A1" },
  { word: "protection", phonetic: "/protection/", meaning: "保护", example: "Environmental protection.", level: "A1" },
  { word: "defense", phonetic: "/defense/", meaning: "防御", example: "A strong defense.", level: "A1" },
  { word: "offense", phonetic: "/offense/", meaning: "进攻", example: "A military offense.", level: "A1" },
  { word: "strategy", phonetic: "/strategy/", meaning: "战略", example: "A winning strategy.", level: "A1" },
  { word: "tactic", phonetic: "/tactic/", meaning: "战术", example: "A clever tactic.", level: "A1" },
  { word: "technique", phonetic: "/technique/", meaning: "技术", example: "A new technique.", level: "A1" },
  { word: "system", phonetic: "/system/", meaning: "系统", example: "An efficient system.", level: "A1" },
  { word: "procedure", phonetic: "/procedure/", meaning: "程序", example: "A standard procedure.", level: "A1" },
  { word: "criterion", phonetic: "/criterion/", meaning: "标准", example: "An entry criterion.", level: "A1" },
  { word: "topic", phonetic: "/topic/", meaning: "话题", example: "A hot topic.", level: "A1" },
  { word: "theme", phonetic: "/theme/", meaning: "主题", example: "A central theme.", level: "A1" },
  { word: "concept", phonetic: "/concept/", meaning: "概念", example: "An abstract concept.", level: "A1" },
  { word: "theory", phonetic: "/theory/", meaning: "理论", example: "A scientific theory.", level: "A1" },
  { word: "hypothesis", phonetic: "/hypothesis/", meaning: "假设", example: "A testable hypothesis.", level: "A1" },
  { word: "evidence", phonetic: "/evidence/", meaning: "证据", example: "Strong evidence.", level: "A1" },
  { word: "proof", phonetic: "/proof/", meaning: "证据", example: "Clear proof.", level: "A1" },
  { word: "data", phonetic: "/data/", meaning: "数据", example: "Raw data.", level: "A1" },
  { word: "routine", phonetic: "/routine/", meaning: "日常", example: "A morning routine.", level: "A1" },
  { word: "ritual", phonetic: "/ritual/", meaning: "仪式", example: "A religious ritual.", level: "A1" },
  { word: "ceremony", phonetic: "/ceremony/", meaning: "典礼", example: "A wedding ceremony.", level: "A1" },
  { word: "celebration", phonetic: "/celebration/", meaning: "庆祝", example: "A birthday celebration.", level: "A1" },
  { word: "occasion", phonetic: "/occasion/", meaning: "场合", example: "A special occasion.", level: "A1" },
  { word: "view", phonetic: "/view/", meaning: "风景", example: "A mountain view.", level: "A1" },
  { word: "landscape", phonetic: "/landscape/", meaning: "风景", example: "A rural landscape.", level: "A1" },
  { word: "scenery", phonetic: "/scenery/", meaning: "景色", example: "Stunning scenery.", level: "A1" },
  { word: "image", phonetic: "/image/", meaning: "图像", example: "A digital image.", level: "A1" },
  { word: "painting", phonetic: "/painting/", meaning: "油画", example: "An oil painting.", level: "A1" },
  { word: "drawing", phonetic: "/drawing/", meaning: "素描", example: "A charcoal drawing.", level: "A1" },
  { word: "sketch", phonetic: "/sketch/", meaning: "草图", example: "A rough sketch.", level: "A1" },
  { word: "portrait", phonetic: "/portrait/", meaning: "肖像", example: "A realistic portrait.", level: "A1" },
  { word: "mural", phonetic: "/mural/", meaning: "壁画", example: "A colorful mural.", level: "A1" },
  { word: "sculpture", phonetic: "/sculpture/", meaning: "雕塑", example: "A marble sculpture.", level: "A1" },
  { word: "statue", phonetic: "/statue/", meaning: "雕像", example: "A bronze statue.", level: "A1" },
  { word: "artwork", phonetic: "/artwork/", meaning: "艺术品", example: "A valuable artwork.", level: "A1" },
  { word: "construction", phonetic: "/construction/", meaning: "建设", example: "Road construction.", level: "A1" },
  { word: "infrastructure", phonetic: "/infrastructure/", meaning: "基础设施", example: "Public infrastructure.", level: "A1" },
  { word: "facility", phonetic: "/facility/", meaning: "设施", example: "A sports facility.", level: "A1" },
  { word: "equipment", phonetic: "/equipment/", meaning: "设备", example: "Gym equipment.", level: "A1" },
  { word: "device", phonetic: "/device/", meaning: "装置", example: "A electronic device.", level: "A1" },
  { word: "gadget", phonetic: "/gadget/", meaning: "小工具", example: "A kitchen gadget.", level: "A1" },
  { word: "instrument", phonetic: "/instrument/", meaning: "乐器", example: "A musical instrument.", level: "A1" },
  { word: "appliance", phonetic: "/appliance/", meaning: "电器", example: "A household appliance.", level: "A1" },
  { word: "mechanism", phonetic: "/mechanism/", meaning: "机制", example: "A locking mechanism.", level: "A1" },
  { word: "motor", phonetic: "/motor/", meaning: "马达", example: "An electric motor.", level: "A1" },
  { word: "battery", phonetic: "/battery/", meaning: "电池", example: "A rechargeable battery.", level: "A1" },
  { word: "cable", phonetic: "/cable/", meaning: "电缆", example: "A fiber optic cable.", level: "A1" },
  { word: "wire", phonetic: "/wire/", meaning: "电线", example: "A copper wire.", level: "A1" },
  { word: "plug", phonetic: "/plug/", meaning: "插头", example: "A power plug.", level: "A1" },
  { word: "socket", phonetic: "/socket/", meaning: "插座", example: "A wall socket.", level: "A1" },
  { word: "switch", phonetic: "/switch/", meaning: "开关", example: "A light switch.", level: "A1" },
  { word: "lever", phonetic: "/lever/", meaning: "杠杆", example: "Pull the lever.", level: "A1" },
  { word: "knob", phonetic: "/knob/", meaning: "旋钮", example: "Turn the knob.", level: "A1" },
  { word: "dial", phonetic: "/dial/", meaning: "拨号盘", example: "A telephone dial.", level: "A1" },
  { word: "screen", phonetic: "/screen/", meaning: "屏幕", example: "A touch screen.", level: "A1" },
  { word: "monitor", phonetic: "/monitor/", meaning: "显示器", example: "A computer monitor.", level: "A1" },
  { word: "keyboard", phonetic: "/keyboard/", meaning: "键盘", example: "A wireless keyboard.", level: "A1" },
  { word: "printer", phonetic: "/printer/", meaning: "打印机", example: "A color printer.", level: "A1" },
  { word: "scanner", phonetic: "/scanner/", meaning: "扫描仪", example: "A document scanner.", level: "A1" },
  { word: "lens", phonetic: "/lens/", meaning: "镜头", example: "A camera lens.", level: "A1" },
  { word: "tripod", phonetic: "/tripod/", meaning: "三脚架", example: "A sturdy tripod.", level: "A1" },
  { word: "microphone", phonetic: "/microphone/", meaning: "麦克风", example: "A wireless microphone.", level: "A1" },
  { word: "speaker", phonetic: "/speaker/", meaning: "音箱", example: "A Bluetooth speaker.", level: "A1" },
  { word: "headphone", phonetic: "/headphone/", meaning: "耳机", example: "Noise-canceling headphones.", level: "A1" },
  { word: "earphone", phonetic: "/earphone/", meaning: "耳塞", example: "Wireless earphones.", level: "A1" },
  { word: "radio", phonetic: "/radio/", meaning: "收音机", example: "A portable radio.", level: "A1" },
  { word: "television", phonetic: "/television/", meaning: "电视", example: "A flat-screen television.", level: "A1" },
  { word: "remote", phonetic: "/remote/", meaning: "遥控器", example: "A TV remote control.", level: "A1" },
  { word: "absent", phonetic: "/absent/", meaning: "缺席的", example: "He was absent today.", level: "A1" },
  { word: "absolute", phonetic: "/absolute/", meaning: "绝对的", example: "An absolute truth.", level: "A1" },
  { word: "abundant", phonetic: "/abundant/", meaning: "丰富的", example: "Abundant resources.", level: "A1" },
  { word: "actual", phonetic: "/actual/", meaning: "实际的", example: "The actual cost.", level: "A1" },
  { word: "acute", phonetic: "/acute/", meaning: "急性的", example: "An acute pain.", level: "A1" },
  { word: "adjacent", phonetic: "/adjacent/", meaning: "相邻的", example: "Adjacent rooms.", level: "A1" },
  { word: "administrative", phonetic: "/administrative/", meaning: "行政的", example: "Administrative work.", level: "A1" },
  { word: "advanced", phonetic: "/advanced/", meaning: "高级的", example: "Advanced technology.", level: "A1" },
  { word: "alive", phonetic: "/alive/", meaning: "活着的", example: "She is alive.", level: "A1" },
  { word: "amateur", phonetic: "/amateur/", meaning: "业余的", example: "An amateur photographer.", level: "A1" },
  { word: "anonymous", phonetic: "/anonymous/", meaning: "匿名的", example: "An anonymous donor.", level: "A1" },
  { word: "anxious", phonetic: "/anxious/", meaning: "焦虑的", example: "An anxious moment.", level: "A1" },
  { word: "artificial", phonetic: "/artificial/", meaning: "人造的", example: "Artificial intelligence.", level: "A1" },
  { word: "asleep", phonetic: "/asleep/", meaning: "睡着的", example: "The baby is asleep.", level: "A1" },
  { word: "automatic", phonetic: "/automatic/", meaning: "自动的", example: "An automatic door.", level: "A1" },
  { word: "awful", phonetic: "/awful/", meaning: "糟糕的", example: "An awful experience.", level: "A1" },
  { word: "backward", phonetic: "/backward/", meaning: "落后的", example: "A backward region.", level: "A1" },
  { word: "bare", phonetic: "/bare/", meaning: "光秃的", example: "A barefoot walk.", level: "A1" },
  { word: "bitter", phonetic: "/bitter/", meaning: "苦的", example: "A bitter taste.", level: "A1" },
  { word: "blank", phonetic: "/blank/", meaning: "空白的", example: "A blank page.", level: "A1" },
  { word: "bold", phonetic: "/bold/", meaning: "大胆的", example: "A bold move.", level: "A1" },
  { word: "boring", phonetic: "/boring/", meaning: "无聊的", example: "A boring movie.", level: "A1" },
  { word: "broad", phonetic: "/broad/", meaning: "宽阔的", example: "A broad smile.", level: "A1" },
  { word: "broken", phonetic: "/broken/", meaning: "破碎的", example: "A broken window.", level: "A1" },
  { word: "capable", phonetic: "/capable/", meaning: "有能力的", example: "A capable leader.", level: "A1" },
  { word: "casual", phonetic: "/casual/", meaning: "随意的", example: "A casual conversation.", level: "A1" },
  { word: "central", phonetic: "/central/", meaning: "中心的", example: "A central location.", level: "A1" },
  { word: "charming", phonetic: "/charming/", meaning: "迷人的", example: "A charming village.", level: "A1" },
  { word: "civil", phonetic: "/civil/", meaning: "公民的", example: "Civil rights.", level: "A1" },
  { word: "classic", phonetic: "/classic/", meaning: "经典的", example: "A classic design.", level: "A1" },
  { word: "clinical", phonetic: "/clinical/", meaning: "临床的", example: "Clinical research.", level: "A1" },
  { word: "closed", phonetic: "/closed/", meaning: "关闭的", example: "A closed door.", level: "A1" },
  { word: "comfortable", phonetic: "/comfortable/", meaning: "舒适的", example: "A comfortable bed.", level: "A1" },
  { word: "communist", phonetic: "/communist/", meaning: "共产主义的", example: "A communist party.", level: "A1" },
  { word: "competitive", phonetic: "/competitive/", meaning: "竞争的", example: "A competitive market.", level: "A1" },
  { word: "confident", phonetic: "/confident/", meaning: "自信的", example: "A confident smile.", level: "A1" },
  { word: "conscious", phonetic: "/conscious/", meaning: "有意识的", example: "A conscious decision.", level: "A1" },
  { word: "conservative", phonetic: "/conservative/", meaning: "保守的", example: "A conservative view.", level: "A1" },
  { word: "constant", phonetic: "/constant/", meaning: "不断的", example: "A constant noise.", level: "A1" },
  { word: "content", phonetic: "/content/", meaning: "满足的", example: "A content smile.", level: "A1" },
  { word: "continuous", phonetic: "/continuous/", meaning: "连续的", example: "Continuous improvement.", level: "A1" },
  { word: "convenient", phonetic: "/convenient/", meaning: "方便的", example: "A convenient location.", level: "A1" },
  { word: "conventional", phonetic: "/conventional/", meaning: "传统的", example: "Conventional methods.", level: "A1" },
  { word: "corresponding", phonetic: "/corresponding/", meaning: "相应的", example: "Corresponding values.", level: "A1" },
  { word: "costly", phonetic: "/costly/", meaning: "昂贵的", example: "A costly mistake.", level: "A1" },
  { word: "creative", phonetic: "/creative/", meaning: "有创造力的", example: "A creative solution.", level: "A1" },
  { word: "criminal", phonetic: "/criminal/", meaning: "犯罪的", example: "A criminal offense.", level: "A1" },
  { word: "critical", phonetic: "/critical/", meaning: "关键的", example: "A critical moment.", level: "A1" },
  { word: "curved", phonetic: "/curved/", meaning: "弯曲的", example: "A curved road.", level: "A1" },
  { word: "daily", phonetic: "/daily/", meaning: "日常的", example: "Daily routine.", level: "A1" },
  { word: "dangerous", phonetic: "/dangerous/", meaning: "危险的", example: "A dangerous situation.", level: "A1" },
  { word: "deaf", phonetic: "/deaf/", meaning: "聋的", example: "A deaf person.", level: "A1" },
  { word: "decent", phonetic: "/decent/", meaning: "体面的", example: "A decent salary.", level: "A1" },
  { word: "definite", phonetic: "/definite/", meaning: "明确的", example: "A definite answer.", level: "A1" },
  { word: "delicate", phonetic: "/delicate/", meaning: "精致的", example: "A delicate flower.", level: "A1" },
  { word: "delicious", phonetic: "/delicious/", meaning: "美味的", example: "A delicious meal.", level: "A1" },
  { word: "democratic", phonetic: "/democratic/", meaning: "民主的", example: "A democratic process.", level: "A1" },
  { word: "dense", phonetic: "/dense/", meaning: "密集的", example: "A dense forest.", level: "A1" },
  { word: "dependent", phonetic: "/dependent/", meaning: "依赖的", example: "Dependent on others.", level: "A1" },
  { word: "desperate", phonetic: "/desperate/", meaning: "绝望的", example: "A desperate attempt.", level: "A1" },
  { word: "detailed", phonetic: "/detailed/", meaning: "详细的", example: "A detailed report.", level: "A1" },
  { word: "digital", phonetic: "/digital/", meaning: "数字的", example: "A digital camera.", level: "A1" },
  { word: "disabled", phonetic: "/disabled/", meaning: "残疾的", example: "Disabled access.", level: "A1" },
  { word: "distant", phonetic: "/distant/", meaning: "遥远的", example: "A distant relative.", level: "A1" },
  { word: "distinct", phonetic: "/distinct/", meaning: "不同的", example: "A distinct difference.", level: "A1" },
  { word: "diverse", phonetic: "/diverse/", meaning: "多样的", example: "A diverse population.", level: "A1" },
  { word: "domestic", phonetic: "/domestic/", meaning: "国内的", example: "Domestic flights.", level: "A1" },
  { word: "dominant", phonetic: "/dominant/", meaning: "主导的", example: "A dominant position.", level: "A1" },
  { word: "dramatic", phonetic: "/dramatic/", meaning: "戏剧性的", example: "A dramatic change.", level: "A1" },
  { word: "drunk", phonetic: "/drunk/", meaning: "醉的", example: "A drunk driver.", level: "A1" },
  { word: "due", phonetic: "/due/", meaning: "到期的", example: "The bill is due.", level: "A1" },
  { word: "eager", phonetic: "/eager/", meaning: "渴望的", example: "An eager student.", level: "A1" },
  { word: "eastern", phonetic: "/eastern/", meaning: "东方的", example: "Eastern culture.", level: "A1" },
  { word: "economic", phonetic: "/economic/", meaning: "经济的", example: "Economic growth.", level: "A1" },
  { word: "educational", phonetic: "/educational/", meaning: "教育的", example: "Educational materials.", level: "A1" },
  { word: "effective", phonetic: "/effective/", meaning: "有效的", example: "An effective method.", level: "A1" },
  { word: "efficient", phonetic: "/efficient/", meaning: "高效的", example: "An efficient system.", level: "A1" },
  { word: "elderly", phonetic: "/elderly/", meaning: "年长的", example: "An elderly person.", level: "A1" },
  { word: "electronic", phonetic: "/electronic/", meaning: "电子的", example: "Electronic devices.", level: "A1" },
  { word: "elegant", phonetic: "/elegant/", meaning: "优雅的", example: "An elegant dress.", level: "A1" },
  { word: "emotional", phonetic: "/emotional/", meaning: "情感的", example: "An emotional speech.", level: "A1" },
  { word: "enormous", phonetic: "/enormous/", meaning: "巨大的", example: "An enormous building.", level: "A1" },
  { word: "environmental", phonetic: "/environmental/", meaning: "环境的", example: "Environmental issues.", level: "A1" },
  { word: "essential", phonetic: "/essential/", meaning: "必要的", example: "Essential skills.", level: "A1" },
  { word: "ethnic", phonetic: "/ethnic/", meaning: "民族的", example: "Ethnic diversity.", level: "A1" },
  { word: "eventual", phonetic: "/eventual/", meaning: "最终的", example: "An eventual success.", level: "A1" },
  { word: "evident", phonetic: "/evident/", meaning: "明显的", example: "An evident problem.", level: "A1" },
  { word: "evil", phonetic: "/evil/", meaning: "邪恶的", example: "An evil plan.", level: "A1" },
  { word: "excessive", phonetic: "/excessive/", meaning: "过度的", example: "Excessive spending.", level: "A1" },
  { word: "exclusive", phonetic: "/exclusive/", meaning: "独家的", example: "Exclusive access.", level: "A1" },
  { word: "existing", phonetic: "/existing/", meaning: "现有的", example: "Existing conditions.", level: "A1" },
  { word: "exotic", phonetic: "/exotic/", meaning: "异国情调的", example: "Exotic flowers.", level: "A1" },
  { word: "expensive", phonetic: "/expensive/", meaning: "昂贵的", example: "An expensive car.", level: "A1" },
  { word: "experienced", phonetic: "/experienced/", meaning: "有经验的", example: "An experienced teacher.", level: "A1" },
  { word: "experimental", phonetic: "/experimental/", meaning: "实验的", example: "Experimental results.", level: "A1" },
  { word: "explicit", phonetic: "/explicit/", meaning: "明确的", example: "Explicit instructions.", level: "A1" },
  { word: "extreme", phonetic: "/extreme/", meaning: "极端的", example: "Extreme weather.", level: "A1" },
  { word: "faint", phonetic: "/faint/", meaning: "微弱的", example: "A faint sound.", level: "A1" },
  { word: "faithful", phonetic: "/faithful/", meaning: "忠诚的", example: "A faithful friend.", level: "A1" },
  { word: "false", phonetic: "/false/", meaning: "错误的", example: "A false statement.", level: "A1" },
  { word: "familiar", phonetic: "/familiar/", meaning: "熟悉的", example: "A familiar face.", level: "A1" },
  { word: "fantastic", phonetic: "/fantastic/", meaning: "极好的", example: "A fantastic view.", level: "A1" },
  { word: "fatal", phonetic: "/fatal/", meaning: "致命的", example: "A fatal accident.", level: "A1" },
  { word: "favorable", phonetic: "/favorable/", meaning: "有利的", example: "Favorable conditions.", level: "A1" },
  { word: "federal", phonetic: "/federal/", meaning: "联邦的", example: "A federal law.", level: "A1" },
  { word: "female", phonetic: "/female/", meaning: "女性的", example: "A female leader.", level: "A1" },
  { word: "fierce", phonetic: "/fierce/", meaning: "凶猛的", example: "A fierce storm.", level: "A1" },
  { word: "financial", phonetic: "/financial/", meaning: "金融的", example: "Financial support.", level: "A1" },
  { word: "firm", phonetic: "/firm/", meaning: "坚定的", example: "A firm decision.", level: "A1" },
  { word: "fixed", phonetic: "/fixed/", meaning: "固定的", example: "A fixed price.", level: "A1" },
  { word: "flexible", phonetic: "/flexible/", meaning: "灵活的", example: "A flexible schedule.", level: "A1" },
  { word: "fluent", phonetic: "/fluent/", meaning: "流利的", example: "A fluent speaker.", level: "A1" },
  { word: "fond", phonetic: "/fond/", meaning: "喜欢的", example: "Fond memories.", level: "A1" },
  { word: "foolish", phonetic: "/foolish/", meaning: "愚蠢的", example: "A foolish mistake.", level: "A1" },
  { word: "formal", phonetic: "/formal/", meaning: "正式的", example: "A formal event.", level: "A1" },
  { word: "former", phonetic: "/former/", meaning: "以前的", example: "A former president.", level: "A1" },
  { word: "fortunate", phonetic: "/fortunate/", meaning: "幸运的", example: "A fortunate event.", level: "A1" },
  { word: "fragile", phonetic: "/fragile/", meaning: "脆弱的", example: "Fragile items.", level: "A1" },
  { word: "frequent", phonetic: "/frequent/", meaning: "频繁的", example: "Frequent visits.", level: "A1" },
  { word: "frightened", phonetic: "/frightened/", meaning: "受惊的", example: "A frightened child.", level: "A1" },
  { word: "frozen", phonetic: "/frozen/", meaning: "冷冻的", example: "Frozen food.", level: "A1" },
  { word: "fundamental", phonetic: "/fundamental/", meaning: "基本的", example: "A fundamental right.", level: "A1" },
  { word: "generous", phonetic: "/generous/", meaning: "慷慨的", example: "A generous donation.", level: "A1" },
  { word: "genuine", phonetic: "/genuine/", meaning: "真诚的", example: "A genuine smile.", level: "A1" },
  { word: "giant", phonetic: "/giant/", meaning: "巨大的", example: "A giant leap.", level: "A1" },
  { word: "gorgeous", phonetic: "/gorgeous/", meaning: "华丽的", example: "A gorgeous view.", level: "A1" },
  { word: "gradual", phonetic: "/gradual/", meaning: "渐进的", example: "A gradual change.", level: "A1" },
  { word: "grand", phonetic: "/grand/", meaning: "宏伟的", example: "A grand palace.", level: "A1" },
  { word: "grateful", phonetic: "/grateful/", meaning: "感激的", example: "A grateful heart.", level: "A1" },
  { word: "grave", phonetic: "/grave/", meaning: "严重的", example: "A grave error.", level: "A1" },
  { word: "greedy", phonetic: "/greedy/", meaning: "贪婪的", example: "A greedy person.", level: "A1" },
  { word: "gross", phonetic: "/gross/", meaning: "总的", example: "Gross income.", level: "A1" },
  { word: "guilty", phonetic: "/guilty/", meaning: "有罪的", example: "A guilty verdict.", level: "A1" },
  { word: "actually", phonetic: "/actually/", meaning: "实际上", example: "Actually, I was wrong.", level: "A1" },
  { word: "against", phonetic: "/against/", meaning: "反对", example: "Against the law.", level: "A1" },
  { word: "ago", phonetic: "/ago/", meaning: "以前", example: "Long ago.", level: "A1" },
  { word: "although", phonetic: "/although/", meaning: "虽然", example: "Although it rained.", level: "A1" },
  { word: "apart", phonetic: "/apart/", meaning: "分开", example: "Apart from that.", level: "A1" },
  { word: "army", phonetic: "/army/", meaning: "军队", example: "Join the army.", level: "A1" },
  { word: "artist", phonetic: "/artist/", meaning: "艺术家", example: "A famous artist.", level: "A1" },
  { word: "attitude", phonetic: "/attitude/", meaning: "态度", example: "A positive attitude.", level: "A1" },
  { word: "author", phonetic: "/author/", meaning: "作者", example: "A best-selling author.", level: "A1" },
  { word: "award", phonetic: "/award/", meaning: "奖", example: "Win an award.", level: "A1" },
  { word: "balance", phonetic: "/balance/", meaning: "平衡", example: "Keep your balance.", level: "A1" },
  { word: "ban", phonetic: "/ban/", meaning: "禁止", example: "Ban smoking.", level: "A1" },
  { word: "band", phonetic: "/band/", meaning: "乐队", example: "A rock band.", level: "A1" },
  { word: "bar", phonetic: "/bar/", meaning: "酒吧", example: "A coffee bar.", level: "A1" },
  { word: "battle", phonetic: "/battle/", meaning: "战斗", example: "A fierce battle.", level: "A1" },
  { word: "besides", phonetic: "/besides/", meaning: "此外", example: "Besides that.", level: "A1" },
  { word: "beyond", phonetic: "/beyond/", meaning: "超越", example: "Beyond belief.", level: "A1" },
  { word: "billion", phonetic: "/billion/", meaning: "十亿", example: "A billion dollars.", level: "A1" },
  { word: "birth", phonetic: "/birth/", meaning: "出生", example: "Date of birth.", level: "A1" },
  { word: "bit", phonetic: "/bit/", meaning: "一点", example: "A little bit.", level: "A1" },
  { word: "blade", phonetic: "/blade/", meaning: "刀片", example: "A sharp blade.", level: "A1" },
  { word: "bomb", phonetic: "/bomb/", meaning: "炸弹", example: "A time bomb.", level: "A1" },
  { word: "bond", phonetic: "/bond/", meaning: "联系", example: "A strong bond.", level: "A1" },
  { word: "branch", phonetic: "/branch/", meaning: "分支", example: "A tree branch.", level: "A1" },
  { word: "brand", phonetic: "/brand/", meaning: "品牌", example: "A popular brand.", level: "A1" },
  { word: "breath", phonetic: "/breath/", meaning: "呼吸", example: "A deep breath.", level: "A1" },
  { word: "brick", phonetic: "/brick/", meaning: "砖", example: "A red brick.", level: "A1" },
  { word: "brilliant", phonetic: "/brilliant/", meaning: "杰出的", example: "A brilliant idea.", level: "A1" },
  { word: "burst", phonetic: "/burst/", meaning: "爆发", example: "A burst of energy.", level: "A1" },
  { word: "bush", phonetic: "/bush/", meaning: "灌木", example: "A green bush.", level: "A1" },
  { word: "cabin", phonetic: "/cabin/", meaning: "小屋", example: "A log cabin.", level: "A1" },
  { word: "campus", phonetic: "/campus/", meaning: "校园", example: "A university campus.", level: "A1" },
  { word: "cancel", phonetic: "/cancel/", meaning: "取消", example: "Cancel the order.", level: "A1" },
  { word: "cancer", phonetic: "/cancer/", meaning: "癌症", example: "A cancer patient.", level: "A1" },
  { word: "careless", phonetic: "/careless/", meaning: "粗心的", example: "A careless mistake.", level: "A1" },
  { word: "case", phonetic: "/case/", meaning: "情况", example: "In that case.", level: "A1" },
  { word: "cast", phonetic: "/cast/", meaning: "铸造", example: "Cast a shadow.", level: "A1" },
  { word: "castle", phonetic: "/castle/", meaning: "城堡", example: "A medieval castle.", level: "A1" },
  { word: "category", phonetic: "/category/", meaning: "类别", example: "A new category.", level: "A1" },
  { word: "cell", phonetic: "/cell/", meaning: "细胞", example: "A living cell.", level: "A1" },
  { word: "chain", phonetic: "/chain/", meaning: "链条", example: "A gold chain.", level: "A1" },
  { word: "chairman", phonetic: "/chairman/", meaning: "主席", example: "The company chairman.", level: "A1" },
  { word: "champion", phonetic: "/champion/", meaning: "冠军", example: "A world champion.", level: "A1" },
  { word: "channel", phonetic: "/channel/", meaning: "频道", example: "A TV channel.", level: "A1" },
  { word: "chapter", phonetic: "/chapter/", meaning: "章节", example: "Chapter one.", level: "A1" },
  { word: "character", phonetic: "/character/", meaning: "角色", example: "A main character.", level: "A1" },
  { word: "charity", phonetic: "/charity/", meaning: "慈善", example: "A charity event.", level: "A1" },
  { word: "chart", phonetic: "/chart/", meaning: "图表", example: "A flow chart.", level: "A1" },
  { word: "cheek", phonetic: "/cheek/", meaning: "脸颊", example: "A rosy cheek.", level: "A1" },
  { word: "chief", phonetic: "/chief/", meaning: "主要的", example: "A chief reason.", level: "A1" },
  { word: "childhood", phonetic: "/childhood/", meaning: "童年", example: "A happy childhood.", level: "A1" },
  { word: "cigarette", phonetic: "/cigarette/", meaning: "香烟", example: "A lit cigarette.", level: "A1" },
  { word: "cinema", phonetic: "/cinema/", meaning: "电影院", example: "Go to the cinema.", level: "A1" },
  { word: "circle", phonetic: "/circle/", meaning: "圆", example: "Draw a circle.", level: "A1" },
  { word: "citizen", phonetic: "/citizen/", meaning: "公民", example: "A law-abiding citizen.", level: "A1" },
  { word: "classroom", phonetic: "/classroom/", meaning: "教室", example: "A school classroom.", level: "A1" },
  { word: "clerk", phonetic: "/clerk/", meaning: "店员", example: "A store clerk.", level: "A1" },
  { word: "cloth", phonetic: "/cloth/", meaning: "布", example: "A piece of cloth.", level: "A1" },
  { word: "code", phonetic: "/code/", meaning: "代码", example: "A dress code.", level: "A1" },
  { word: "column", phonetic: "/column/", meaning: "专栏", example: "A newspaper column.", level: "A1" },
  { word: "combination", phonetic: "/combination/", meaning: "组合", example: "A winning combination.", level: "A1" },
  { word: "committee", phonetic: "/committee/", meaning: "委员会", example: "A planning committee.", level: "A1" },
  { word: "consumer", phonetic: "/consumer/", meaning: "消费者", example: "A consumer product.", level: "A1" },
  { word: "contact", phonetic: "/contact/", meaning: "联系", example: "Contact me.", level: "A1" },
  { word: "contest", phonetic: "/contest/", meaning: "比赛", example: "A beauty contest.", level: "A1" },
  { word: "cooperation", phonetic: "/cooperation/", meaning: "合作", example: "Team cooperation.", level: "A1" },
  { word: "cotton", phonetic: "/cotton/", meaning: "棉花", example: "Cotton fabric.", level: "A1" },
  { word: "counter", phonetic: "/counter/", meaning: "柜台", example: "A shop counter.", level: "A1" },
  { word: "countryside", phonetic: "/countryside/", meaning: "农村", example: "The countryside.", level: "A1" },
  { word: "county", phonetic: "/county/", meaning: "县", example: "A rural county.", level: "A1" },
  { word: "court", phonetic: "/court/", meaning: "法庭", example: "A court case.", level: "A1" },
  { word: "creature", phonetic: "/creature/", meaning: "生物", example: "A living creature.", level: "A1" },
  { word: "credit", phonetic: "/credit/", meaning: "信用", example: "A good credit.", level: "A1" },
  { word: "crime", phonetic: "/crime/", meaning: "犯罪", example: "A violent crime.", level: "A1" },
  { word: "crisis", phonetic: "/crisis/", meaning: "危机", example: "A financial crisis.", level: "A1" },
  { word: "crop", phonetic: "/crop/", meaning: "庄稼", example: "A good crop.", level: "A1" },
  { word: "crystal", phonetic: "/crystal/", meaning: "水晶", example: "A crystal clear.", level: "A1" },
  { word: "currency", phonetic: "/currency/", meaning: "货币", example: "Foreign currency.", level: "A1" },
  { word: "cycle", phonetic: "/cycle/", meaning: "循环", example: "A vicious cycle.", level: "A1" },
  { word: "damp", phonetic: "/damp/", meaning: "潮湿", example: "A damp room.", level: "A1" },
  { word: "date", phonetic: "/date/", meaning: "日期", example: "A due date.", level: "A1" },
  { word: "demonstrate", phonetic: "/demonstrate/", meaning: "演示", example: "Demonstrate the skill.", level: "A1" },
  { word: "department", phonetic: "/department/", meaning: "部门", example: "A sales department.", level: "A1" },
  { word: "deposit", phonetic: "/deposit/", meaning: "存款", example: "A bank deposit.", level: "A1" },
  { word: "derive", phonetic: "/derive/", meaning: "起源", example: "Derive from Latin.", level: "A1" },
  { word: "desire", phonetic: "/desire/", meaning: "渴望", example: "A strong desire.", level: "A1" },
  { word: "despite", phonetic: "/despite/", meaning: "尽管", example: "Despite the rain.", level: "A1" },
  { word: "destination", phonetic: "/destination/", meaning: "目的地", example: "A popular destination.", level: "A1" },
  { word: "detail", phonetic: "/detail/", meaning: "细节", example: "Every detail.", level: "A1" },
  { word: "determine", phonetic: "/determine/", meaning: "决定", example: "Determine the cause.", level: "A1" },
  { word: "devote", phonetic: "/devote/", meaning: "奉献", example: "Devote your time.", level: "A1" },
  { word: "diamond", phonetic: "/diamond/", meaning: "钻石", example: "A diamond ring.", level: "A1" },
  { word: "diary", phonetic: "/diary/", meaning: "日记", example: "A personal diary.", level: "A1" },
  { word: "difficulty", phonetic: "/difficulty/", meaning: "困难", example: "Financial difficulty.", level: "A1" },
  { word: "dimension", phonetic: "/dimension/", meaning: "维度", example: "A new dimension.", level: "A1" },
  { word: "director", phonetic: "/director/", meaning: "导演", example: "A film director.", level: "A1" },
  { word: "disability", phonetic: "/disability/", meaning: "残疾", example: "A physical disability.", level: "A1" },
  { word: "disaster", phonetic: "/disaster/", meaning: "灾难", example: "A natural disaster.", level: "A1" },
  { word: "discipline", phonetic: "/discipline/", meaning: "纪律", example: "School discipline.", level: "A1" },
  { word: "discount", phonetic: "/discount/", meaning: "折扣", example: "A special discount.", level: "A1" },
  { word: "discovery", phonetic: "/discovery/", meaning: "发现", example: "A scientific discovery.", level: "A1" },
  { word: "disorder", phonetic: "/disorder/", meaning: "混乱", example: "A mental disorder.", level: "A1" },
  { word: "distinguish", phonetic: "/distinguish/", meaning: "区分", example: "Distinguish right from wrong.", level: "A1" },
  { word: "district", phonetic: "/district/", meaning: "地区", example: "A business district.", level: "A1" },
  { word: "disturb", phonetic: "/disturb/", meaning: "打扰", example: "Do not disturb.", level: "A1" },
  { word: "division", phonetic: "/division/", meaning: "部门", example: "A military division.", level: "A1" },
  { word: "dominate", phonetic: "/dominate/", meaning: "主导", example: "Dominate the market.", level: "A1" },
  { word: "draft", phonetic: "/draft/", meaning: "草稿", example: "A first draft.", level: "A1" },
  { word: "drawer", phonetic: "/drawer/", meaning: "抽屉", example: "A desk drawer.", level: "A1" },
  { word: "driver", phonetic: "/driver/", meaning: "司机", example: "A bus driver.", level: "A1" },
  { word: "drown", phonetic: "/drown/", meaning: "溺水", example: "Drown in debt.", level: "A1" },
  { word: "drug", phonetic: "/drug/", meaning: "药物", example: "A prescription drug.", level: "A1" },
  { word: "drum", phonetic: "/drum/", meaning: "鼓", example: "A bass drum.", level: "A1" },
  { word: "dump", phonetic: "/dump/", meaning: "倾倒", example: "Dump the trash.", level: "A1" },
  { word: "dwelling", phonetic: "/dwelling/", meaning: "住所", example: "A humble dwelling.", level: "A1" },
  { word: "dynamic", phonetic: "/dynamic/", meaning: "动态", example: "A dynamic market.", level: "A1" },
  { word: "ease", phonetic: "/ease/", meaning: "容易", example: "With ease.", level: "A1" },
  { word: "easily", phonetic: "/easily/", meaning: "容易地", example: "Easily done.", level: "A1" },
  { word: "echo", phonetic: "/echo/", meaning: "回声", example: "An echo effect.", level: "A1" },
  { word: "edition", phonetic: "/edition/", meaning: "版本", example: "A special edition.", level: "A1" },
  { word: "editor", phonetic: "/editor/", meaning: "编辑", example: "A newspaper editor.", level: "A1" },
  { word: "elder", phonetic: "/elder/", meaning: "长者", example: "An elder statesman.", level: "A1" },
  { word: "election", phonetic: "/election/", meaning: "选举", example: "A presidential election.", level: "A1" },
  { word: "electricity", phonetic: "/electricity/", meaning: "电力", example: "Generate electricity.", level: "A1" },
  { word: "element", phonetic: "/element/", meaning: "元素", example: "A chemical element.", level: "A1" },
  { word: "eliminate", phonetic: "/eliminate/", meaning: "淘汰", example: "Eliminate the risk.", level: "A1" },
  { word: "elsewhere", phonetic: "/elsewhere/", meaning: "别处", example: "Go elsewhere.", level: "A1" },
  { word: "email", phonetic: "/email/", meaning: "电子邮件", example: "Send an email.", level: "A1" },
  { word: "embrace", phonetic: "/embrace/", meaning: "拥抱", example: "Embrace the change.", level: "A1" },
  { word: "emergency", phonetic: "/emergency/", meaning: "紧急情况", example: "An emergency exit.", level: "A1" },
  { word: "emotion", phonetic: "/emotion/", meaning: "情感", example: "A deep emotion.", level: "A1" },
  { word: "emphasis", phonetic: "/emphasis/", meaning: "强调", example: "A strong emphasis.", level: "A1" },
  { word: "empire", phonetic: "/empire/", meaning: "帝国", example: "A vast empire.", level: "A1" },
  { word: "employment", phonetic: "/employment/", meaning: "就业", example: "Full employment.", level: "A1" },
  { word: "encounter", phonetic: "/encounter/", meaning: "遭遇", example: "An unexpected encounter.", level: "A1" },
  { word: "engage", phonetic: "/engage/", meaning: "从事", example: "Engage in dialogue.", level: "A1" },
  { word: "ensure", phonetic: "/ensure/", meaning: "确保", example: "Ensure safety.", level: "A1" },
  { word: "enterprise", phonetic: "/enterprise/", meaning: "企业", example: "A private enterprise.", level: "A1" },
  { word: "entertainment", phonetic: "/entertainment/", meaning: "娱乐", example: "Family entertainment.", level: "A1" },
  { word: "entrepreneur", phonetic: "/entrepreneur/", meaning: "企业家", example: "A young entrepreneur.", level: "A1" },
  { word: "entry", phonetic: "/entry/", meaning: "条目", example: "A dictionary entry.", level: "A1" },
  { word: "envelope", phonetic: "/envelope/", meaning: "信封", example: "A sealed envelope.", level: "A1" },
  { word: "episode", phonetic: "/episode/", meaning: "插曲", example: "A funny episode.", level: "A1" },
  { word: "establish", phonetic: "/establish/", meaning: "建立", example: "Establish a business.", level: "A1" },
  { word: "estate", phonetic: "/estate/", meaning: "地产", example: "Real estate.", level: "A1" },
  { word: "estimate", phonetic: "/estimate/", meaning: "估计", example: "A rough estimate.", level: "A1" },
  { word: "evaluate", phonetic: "/evaluate/", meaning: "评估", example: "Evaluate the results.", level: "A1" },
  { word: "even", phonetic: "/even/", meaning: "甚至", example: "Even better.", level: "A1" },
  { word: "eventually", phonetic: "/eventually/", meaning: "最终", example: "Eventually, it worked.", level: "A1" },
  { word: "everybody", phonetic: "/everybody/", meaning: "每个人", example: "Everybody knows.", level: "A1" },
  { word: "evolution", phonetic: "/evolution/", meaning: "进化", example: "Human evolution.", level: "A1" },
  { word: "exactly", phonetic: "/exactly/", meaning: "精确地", example: "Exactly right.", level: "A1" },
  { word: "examination", phonetic: "/examination/", meaning: "检查", example: "A medical examination.", level: "A1" },
  { word: "executive", phonetic: "/executive/", meaning: "高管", example: "A senior executive.", level: "A1" },
  { word: "exhibit", phonetic: "/exhibit/", meaning: "展览", example: "An art exhibit.", level: "A1" },
  { word: "exhibition", phonetic: "/exhibition/", meaning: "展览会", example: "A trade exhibition.", level: "A1" },
  { word: "existence", phonetic: "/existence/", meaning: "存在", example: "A peaceful existence.", level: "A1" },
  { word: "expansion", phonetic: "/expansion/", meaning: "扩张", example: "A business expansion.", level: "A1" },
  { word: "expert", phonetic: "/expert/", meaning: "专家", example: "A medical expert.", level: "A1" },
  { word: "explanation", phonetic: "/explanation/", meaning: "说明", example: "A clear explanation.", level: "A1" },
  { word: "explode", phonetic: "/explode/", meaning: "爆炸", example: "The bomb explodes.", level: "A1" },
  { word: "explosion", phonetic: "/explosion/", meaning: "爆炸", example: "A gas explosion.", level: "A1" },
  { word: "expression", phonetic: "/expression/", meaning: "表情", example: "A facial expression.", level: "A1" },
  { word: "extension", phonetic: "/extension/", meaning: "延期", example: "A deadline extension.", level: "A1" },
  { word: "extensive", phonetic: "/extensive/", meaning: "广泛", example: "Extensive research.", level: "A1" },
  { word: "extent", phonetic: "/extent/", meaning: "程度", example: "To a large extent.", level: "A1" },
  { word: "external", phonetic: "/external/", meaning: "外部", example: "An external source.", level: "A1" },
  { word: "extraordinary", phonetic: "/extraordinary/", meaning: "非凡", example: "An extraordinary talent.", level: "A1" },
  { word: "extremely", phonetic: "/extremely/", meaning: "极其", example: "Extremely difficult.", level: "A1" },
]

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


const wordBooks = [
  {
    id: "general",
    title: "普通学习",
    tag: "基础",
    description: "系统全部 2485 词 + 你导入的自定义词库。",
    wordNames: null,
  },
  {
    id: "middle-school",
    title: "中考词汇",
    tag: "中考",
    description: "覆盖初中阶段常见生活、校园和基础表达。622词",
    wordNames: [
      "abandon", "able", "about", "above", "accept", "across", "act", "add",
      "admit", "adult", "advise", "afraid", "after", "afternoon", "again", "age",
      "agree", "ahead", "air", "airport", "allow", "almost", "alone", "along",
      "already", "also", "always", "amazing", "among", "ancient", "angry", "animal",
      "announce", "another", "answer", "any", "anyone", "anything", "anywhere", "appear",
      "apple", "area", "arm", "around", "arrive", "art", "ask", "attention",
      "aunt", "autumn", "available", "avoid", "awake", "away", "baby", "back",
      "bad", "bag", "ball", "banana", "bank", "base", "basic", "basket",
      "bath", "bathroom", "beach", "bear", "beat", "beautiful", "because", "become",
      "bed", "bedroom", "before", "begin", "behind", "believe", "bell", "below",
      "beside", "best", "better", "between", "big", "bike", "bird", "birthday",
      "black", "blind", "blood", "blow", "blue", "board", "boat", "body",
      "bone", "book", "born", "borrow", "boss", "both", "bottle", "bottom",
      "bowl", "box", "boy", "brain", "brave", "bread", "break", "breakfast",
      "bright", "bring", "brother", "brown", "brush", "build", "building", "burn",
      "bus", "business", "busy", "butter", "button", "buy", "cake", "call",
      "calm", "camera", "camp", "car", "card", "care", "careful", "carry",
      "cat", "catch", "cause", "celebrate", "center", "century", "certain", "chair",
      "chance", "change", "charge", "cheap", "check", "cheese", "chicken", "child",
      "choice", "choose", "church", "city", "claim", "class", "clean", "clear",
      "clever", "climb", "clock", "close", "clothes", "cloud", "club", "coach",
      "coast", "coat", "coffee", "coin", "cold", "collect", "college", "color",
      "come", "common", "community", "company", "compare", "compete", "complete", "computer",
      "consider", "contain", "continue", "control", "cook", "cool", "copy", "corner",
      "correct", "cost", "count", "country", "couple", "courage", "course", "cousin",
      "cover", "crash", "crazy", "create", "cross", "crowd", "cry", "culture",
      "cup", "current", "customer", "cut", "damage", "dance", "danger", "dark",
      "daughter", "dead", "deal", "dear", "death", "decide", "deep", "degree",
      "depend", "describe", "design", "desk", "develop", "die", "diet", "difference",
      "different", "difficult", "dig", "dinner", "direct", "direction", "dirty", "discover",
      "discuss", "disease", "dish", "distance", "divide", "doctor", "document", "dog",
      "dollar", "door", "double", "doubt", "down", "draw", "dream", "dress",
      "drink", "drive", "drop", "dry", "during", "dust", "duty", "each",
      "ear", "early", "earn", "earth", "east", "easy", "eat", "edge",
      "education", "effect", "effort", "egg", "eight", "either", "electric", "elephant",
      "else", "empty", "encourage", "end", "enemy", "energy", "engine", "engineer",
      "enjoy", "enough", "enter", "entire", "entrance", "equal", "error", "escape",
      "especially", "evening", "event", "ever", "every", "everyone", "everything", "everywhere",
      "exact", "examine", "example", "excellent", "except", "exchange", "excited", "exciting",
      "excuse", "exercise", "exist", "expect", "experience", "experiment", "explain", "express",
      "extra", "eye", "face", "fact", "factory", "fail", "fair", "fall",
      "family", "famous", "fan", "far", "farm", "fast", "fat", "father",
      "favorite", "fear", "feed", "feel", "festival", "few", "field", "fight",
      "fill", "film", "final", "finally", "find", "fine", "finger", "finish",
      "fire", "first", "fish", "fit", "fix", "flag", "flat", "flight",
      "floor", "flower", "fly", "follow", "food", "fool", "foot", "football",
      "force", "foreign", "forest", "forever", "forget", "form", "forward", "free",
      "freedom", "fresh", "friend", "friendly", "front", "fruit", "full", "fun",
      "funny", "future", "gain", "game", "garden", "gate", "gather", "general",
      "gentle", "get", "gift", "girl", "give", "glad", "glass", "global",
      "go", "goal", "gold", "golden", "good", "government", "grade", "grain",
      "grandfather", "grandmother", "grass", "great", "green", "greet", "ground", "group",
      "grow", "guard", "guess", "guest", "guide", "habit", "hair", "half",
      "hall", "hand", "happen", "happy", "hard", "hat", "hate", "head",
      "health", "hear", "heart", "heat", "heavy", "hello", "help", "here",
      "hero", "hide", "high", "hill", "history", "hit", "hold", "hole",
      "holiday", "home", "honest", "hope", "horse", "hospital", "hot", "hotel",
      "hour", "house", "huge", "human", "hundred", "hungry", "hunt", "hurry",
      "hurt", "husband", "idea", "identify", "ignore", "ill", "imagine", "important",
      "impossible", "improve", "include", "increase", "independent", "industry", "influence", "information",
      "inside", "insist", "instead", "interest", "interested", "interesting", "international", "internet",
      "interview", "into", "introduce", "invent", "invest", "invite", "island", "issue",
      "item", "jacket", "job", "join", "joke", "journey", "joy", "judge",
      "juice", "jump", "just", "keep", "key", "kid", "kill", "kind",
      "king", "kitchen", "knee", "knife", "knock", "know", "knowledge", "land",
      "language", "large", "last", "late", "later", "laugh", "law", "lead",
      "leader", "learn", "leave", "left", "leg", "lend", "less", "lesson",
      "let", "letter", "level", "library", "lie", "life", "lift", "light",
      "like", "limit", "line", "list", "listen", "little", "live", "local",
      "lock", "long", "look", "lose", "lot", "love", "low", "luck",
      "lunch", "machine", "magazine", "main", "major", "make", "man", "manage",
      "manager", "manner", "many", "market", "married", "matter", "may", "maybe",
      "me", "meal", "mean", "meaning", "measure", "meat", "medicine", "meet",
      "meeting", "member", "memory", "mention", "message", "method", "middle", "might",
      "mile", "milk", "million", "mind", "mine", "minute", "miss", "mistake",
      "mix", "modern", "moment", "money", "month", "moon", "more", "morning",
      "most", "mother", "mountain", "mouth", "move", "movie", "much", "music",
      "must", "my", "myself", "name", "nation", "national"
    ],
  },
  {
    id: "gaokao",
    title: "高考词汇",
    tag: "高考",
    description: "面向高中阅读、写作和完形常见核心词。622词",
    wordNames: [
      "natural", "nature", "near", "nearly", "necessary", "neck", "need", "neighbor",
      "neither", "nervous", "never", "new", "news", "newspaper", "next", "nice",
      "night", "nine", "no", "nobody", "noise", "none", "nor", "normal",
      "north", "nose", "not", "note", "nothing", "notice", "now", "number",
      "nurse", "object", "occur", "ocean", "of", "off", "offer", "office",
      "officer", "official", "often", "oil", "old", "on", "once", "one",
      "only", "open", "operation", "opinion", "opportunity", "opposite", "or", "orange",
      "order", "ordinary", "organization", "other", "otherwise", "our", "out", "outside",
      "over", "own", "owner", "page", "pain", "paint", "pair", "palace",
      "pan", "paper", "parent", "park", "part", "partner", "party", "pass",
      "passenger", "passport", "past", "path", "patient", "pattern", "pay", "peace",
      "pen", "pencil", "people", "per", "perfect", "perhaps", "period", "permission",
      "person", "personal", "phone", "photo", "physics", "piano", "pick", "picture",
      "piece", "pig", "place", "plan", "plane", "plant", "plate", "play",
      "player", "please", "pleasure", "plenty", "pocket", "poem", "point", "police",
      "polite", "pool", "poor", "popular", "position", "positive", "possible", "post",
      "pot", "potato", "pound", "pour", "power", "practice", "pray", "prefer",
      "prepare", "present", "president", "press", "pretend", "pretty", "prevent", "price",
      "pride", "primary", "prince", "princess", "principle", "print", "prison", "private",
      "prize", "probably", "problem", "process", "produce", "product", "production", "professor",
      "program", "progress", "project", "promise", "proper", "protect", "proud", "prove",
      "provide", "public", "pull", "punish", "pupil", "purpose", "push", "put",
      "quality", "quantity", "quarter", "queen", "question", "quick", "quickly", "quiet",
      "quite", "race", "rain", "raise", "rapid", "rather", "reach", "read",
      "ready", "real", "realize", "really", "reason", "receive", "recent", "recently",
      "recognize", "record", "red", "reduce", "refer", "refuse", "region", "regular",
      "relation", "remain", "remember", "remove", "repair", "repeat", "replace", "reply",
      "report", "represent", "require", "research", "resource", "respect", "rest", "restaurant",
      "result", "return", "reveal", "review", "rich", "ride", "right", "ring",
      "rise", "river", "road", "rock", "role", "room", "root", "rope",
      "rose", "round", "row", "rule", "run", "rush", "sad", "safe",
      "sail", "salt", "same", "sand", "satisfy", "save", "say", "scene",
      "school", "science", "sea", "search", "season", "seat", "second", "secret",
      "section", "see", "seed", "seem", "sell", "send", "senior", "sense",
      "sentence", "separate", "serious", "serve", "service", "set", "several", "shake",
      "shall", "shape", "share", "sharp", "she", "sheep", "sheet", "shine",
      "ship", "shirt", "shock", "shoe", "shoot", "shop", "short", "should",
      "shoulder", "shout", "show", "shut", "shy", "sick", "side", "sight",
      "sign", "silence", "silly", "silver", "similar", "simple", "since", "sing",
      "single", "sir", "sister", "sit", "situation", "size", "skill", "skin",
      "sky", "sleep", "slow", "slowly", "small", "smart", "smell", "smile",
      "smoke", "snow", "so", "soft", "soldier", "solve", "some", "somebody",
      "someone", "something", "sometimes", "son", "song", "soon", "sort", "soul",
      "sound", "soup", "south", "space", "speak", "special", "speech", "speed",
      "spend", "spirit", "spoon", "sport", "spread", "spring", "square", "stage",
      "stand", "standard", "star", "start", "state", "station", "stay", "steal",
      "steam", "steel", "step", "stick", "still", "stomach", "stone", "stop",
      "store", "storm", "story", "strange", "stranger", "street", "strength", "strict",
      "strike", "strong", "structure", "student", "study", "stupid", "subject", "success",
      "such", "suddenly", "suffer", "sugar", "suggest", "suit", "summer", "sun",
      "supper", "supply", "support", "suppose", "sure", "surprise", "sweet", "swim",
      "table", "tail", "take", "talk", "tall", "taste", "taxi", "tea",
      "teach", "teacher", "team", "technology", "tell", "temperature", "ten", "tend",
      "term", "terrible", "test", "text", "than", "thank", "that", "the",
      "theater", "their", "them", "then", "there", "these", "they", "thick",
      "thin", "thing", "think", "third", "this", "those", "though", "thought",
      "thousand", "threat", "throat", "through", "throw", "thus", "ticket", "tidy",
      "tie", "tight", "till", "time", "tiny", "tired", "title", "today",
      "together", "tomorrow", "tongue", "tonight", "too", "tool", "tooth", "top",
      "total", "touch", "tough", "tour", "toward", "tower", "town", "toy",
      "track", "trade", "tradition", "traffic", "train", "training", "transfer", "travel",
      "treasure", "treat", "tree", "trip", "trouble", "truck", "true", "trust",
      "truth", "try", "turn", "twice", "type", "ugly", "uncle", "under",
      "understand", "university", "unless", "until", "up", "upon", "use", "used",
      "useful", "usual", "usually", "value", "variety", "very", "victory", "village",
      "visit", "voice", "wait", "wake", "walk", "wall", "want", "war",
      "warm", "warn", "wash", "waste", "watch", "water", "wave", "way",
      "we", "weak", "wealth", "weapon", "wear", "weather", "website", "wedding",
      "week", "weekend", "weigh", "weight", "welcome", "well", "west", "western",
      "wet", "what", "whatever", "when", "where", "whether", "which", "while",
      "white", "who", "whole", "whom", "whose", "why", "wide", "wife",
      "wild", "will", "win", "wind", "window", "wine", "wing", "winter",
      "wise", "wish", "with", "within", "without", "woman", "wonder", "wonderful",
      "wood", "word", "work", "worker", "world", "worry", "worse", "worst",
      "worth", "would", "wound", "wrap", "write", "wrong", "yard", "year",
      "yellow", "yes", "yesterday", "yet", "you", "young", "your", "youth",
      "zero", "zone", "alarm", "as", "at", "attack", "be", "but",
      "by", "can", "capital", "concern", "condition", "dad"
    ],
  },
  {
    id: "cet4",
    title: "四级词汇",
    tag: "CET-4",
    description: "适合四级基础阅读、听力和写作的高频词。622词",
    wordNames: [
      "day", "dull", "feature", "gas", "god", "gun", "have", "host",
      "how", "indeed", "indicate", "individual", "inform", "initial", "invade", "itself",
      "junior", "lay", "account", "achieve", "addition", "address", "administration", "admire",
      "adopt", "advance", "advantage", "adventure", "advertise", "affect", "afford", "agency",
      "agent", "aggressive", "agriculture", "aim", "alcohol", "alternative", "ambition", "amount",
      "analyse", "ancestor", "annual", "anxiety", "anyway", "apartment", "apologize", "apparent",
      "apparently", "appeal", "appetite", "application", "appointment", "appreciate", "approach", "appropriate",
      "approve", "architect", "argument", "arrange", "arrest", "arrow", "article", "aside",
      "aspect", "assess", "assignment", "assist", "associate", "assume", "atmosphere", "attach",
      "attempt", "attend", "attract", "audience", "authority", "average", "aware", "abstract",
      "abuse", "academic", "accelerate", "accommodate", "accompany", "accomplish", "accurate", "accuse",
      "acknowledge", "acquire", "adapt", "adequate", "adjust", "adolescent", "advocate", "affair",
      "agenda", "aid", "alien", "align", "allocate", "alter", "ambitious", "amendment",
      "ample", "anticipate", "apparatus", "applicable", "appraisal", "apprehend", "arbitrary", "articulate",
      "aspire", "assert", "asset", "assimilate", "assumption", "asylum", "attain", "attribute",
      "authorize", "autonomy", "backdrop", "benchmark", "bias", "bizarre", "bloom", "bolster",
      "boycott", "breach", "brief", "browse", "bulk", "burden", "bureaucracy", "campaign",
      "candidate", "capability", "capacity", "cascade", "catastrophe", "cease", "chronic", "circulate",
      "cite", "clarify", "clause", "coalition", "cognitive", "coincide", "collaborate", "collapse",
      "commemorate", "commence", "commission", "commodity", "communal", "compact", "comparable", "compassion",
      "compel", "compensate", "compile", "complement", "complex", "comply", "component", "compose",
      "comprehensive", "compromise", "compulsory", "conceive", "concentrate", "conception", "conclude", "concrete",
      "condemn", "conduct", "confine", "confirm", "conform", "confront", "congress", "conscience",
      "consensus", "consent", "consequence", "conserve", "considerable", "consist", "consistent", "constitute",
      "construct", "consult", "consume", "contemplate", "contemporary", "contempt", "contend", "context",
      "contradict", "contrary", "contrast", "contribute", "controversial", "controversy", "convention", "convert",
      "convey", "convince", "cooperate", "coordinate", "cope", "core", "corporate", "correspond",
      "corrupt", "counsel", "counterpart", "coup", "courtesy", "coverage", "crack", "craft",
      "credentials", "crew", "criteria", "critique", "crucial", "cultivate", "curiosity", "curriculum",
      "custody", "customs", "cynical", "abolish", "abortion", "absorb", "absurd", "abundance",
      "accumulate", "acquisition", "aggregate", "alert", "ambiguous", "amend", "analogy", "pants",
      "skirt", "cap", "scarf", "gloves", "belt", "socks", "shoes", "boots",
      "sandals", "sneakers", "uniform", "pajamas", "sweater", "jeans", "blouse", "shorts",
      "underwear", "grape", "strawberry", "watermelon", "peach", "pear", "cherry", "lemon",
      "mango", "pineapple", "coconut", "avocado", "tomato", "carrot", "onion", "garlic",
      "pepper", "cucumber", "lettuce", "cabbage", "broccoli", "mushroom", "corn", "peas",
      "beans", "rice", "noodle", "toast", "sandwich", "burger", "pizza", "pasta",
      "salad", "steak", "pork", "beef", "shrimp", "yogurt", "cream", "vinegar",
      "sauce", "honey", "jam", "peanut", "walnut", "almond", "chocolate", "candy",
      "cookie", "ice cream", "soda", "beer", "elbow", "wrist", "thumb", "chest",
      "waist", "hip", "ankle", "toe", "muscle", "lung", "living room", "dining room",
      "garage", "balcony", "attic", "basement", "roof", "ceiling", "stairs", "elevator",
      "hallway", "closet", "fence", "driveway", "sofa", "couch", "bookshelf", "wardrobe",
      "dresser", "nightstand", "mirror", "lamp", "carpet", "curtain", "pillow", "blanket",
      "towel", "sink", "toilet", "shower", "bathtub", "oven", "stove", "microwave",
      "refrigerator", "dishwasher", "washing machine", "dryer", "vacuum", "subway", "bicycle", "motorcycle",
      "ambulance", "fire truck", "helicopter", "thunder", "lightning", "fog", "ice", "frost",
      "rainbow", "forecast", "climate", "dawn", "dusk", "midnight", "noon", "decade",
      "era", "anniversary", "vacation", "schedule", "calendar", "deadline", "argue", "disagree",
      "recommend", "forgive", "complain", "praise", "criticize", "request", "demand", "command",
      "instruction", "advice", "suggestion", "decision", "option", "possibility", "probability", "risk",
      "solution", "circumstance", "environment", "background", "tale", "myth", "legend", "mystery",
      "puzzle", "riddle", "trick", "humor", "comedy", "drama", "tragedy", "action",
      "romance", "fiction", "nonfiction", "poetry", "novel", "short story", "essay", "summary",
      "analysis", "exam", "quiz", "presentation", "lecture", "diploma", "certificate", "qualification",
      "talent", "ability", "weakness", "disadvantage", "benefit", "drawback", "characteristic", "expense",
      "budget", "income", "salary", "wage", "profit", "loss", "investment", "savings",
      "debt", "loan", "mortgage", "insurance", "tax", "bill", "receipt", "cash",
      "credit card", "bank account", "ATM", "exchange rate", "stock market", "economy", "corporation", "regulation",
      "policy", "agreement", "contract", "negotiation", "conference", "discussion", "conversation", "dialogue",
      "debate", "conflict", "justice", "equality", "democracy", "religion", "custom", "belief",
      "morality", "ethics", "philosophy", "engineering", "mathematics", "chemistry", "biology", "geography",
      "geology", "astronomy", "psychology", "sociology", "economics", "politics", "photography", "literature",
      "architecture", "fashion", "sports", "fitness", "nutrition", "cooking", "tourism", "climate change",
      "pollution", "recycling", "sustainability", "conservation", "ecology", "biodiversity", "apply", "behave",
      "belong", "bend", "bet", "bite", "blame", "bleed", "bless", "block",
      "boil", "bother", "bounce", "breathe", "broadcast", "bury", "calculate", "capture",
      "challenge", "chase", "cheat", "cheer", "clap", "click", "combine", "comfort",
      "comment", "commit", "communicate", "confuse", "crush", "cure", "dare", "declare",
      "decorate", "defeat", "defend", "define", "delay", "deliver", "deny", "deserve",
      "destroy", "detect", "disappear", "dismiss", "display", "distribute", "donate", "download",
      "drag", "educate", "elect", "embarrass", "emerge", "employ", "enable", "excite",
      "exclude", "execute", "expand", "explore", "export", "expose", "extend", "fade",
      "fancy", "flash", "float", "flow", "fold", "found", "freeze", "frighten",
      "generate", "glow", "govern", "grab", "graduate", "grant", "grasp", "handle",
      "hang", "harm", "heal", "honor", "import", "impress", "inherit", "injure",
      "insert", "inspect", "inspire", "install", "instruct", "insure", "integrate", "intend",
      "interrupt", "investigate", "involve", "isolate", "justify", "kick"
    ],
  },
  {
    id: "cet6",
    title: "六级词汇",
    tag: "CET-6",
    description: "偏抽象表达、学术阅读和观点论证词。619词",
    wordNames: [
      "kiss", "launch", "lean", "leap", "link", "load", "maintain", "mark",
      "match", "melt", "multiply", "murder", "negotiate", "obey", "observe", "obtain",
      "operate", "oppose", "organize", "owe", "perform", "permit", "polish", "pollute",
      "possess", "predict", "preserve", "promote", "publish", "qualify", "quit", "quote",
      "recover", "recycle", "reflect", "register", "regret", "reject", "relax", "release",
      "rely", "renew", "rescue", "reserve", "resign", "resist", "resolve", "respond",
      "restore", "restrict", "retain", "retire", "roll", "sacrifice", "secure", "seek",
      "select", "settle", "shave", "shrink", "signal", "slide", "slip", "spare",
      "squeeze", "stretch", "struggle", "submit", "succeed", "surround", "survive", "suspect",
      "swallow", "swear", "sweep", "swing", "tear", "threaten", "translate", "transport",
      "trigger", "unite", "update", "urge", "vary", "vote", "wander", "whisper",
      "cow", "goat", "duck", "rabbit", "mouse", "rat", "snake", "frog",
      "turtle", "monkey", "lion", "tiger", "wolf", "fox", "deer", "giraffe",
      "zebra", "kangaroo", "panda", "whale", "dolphin", "shark", "eagle", "owl",
      "parrot", "penguin", "ant", "bee", "butterfly", "spider", "mosquito", "valley",
      "lake", "jungle", "desert", "plain", "cliff", "cave", "waterfall", "volcano",
      "earthquake", "flood", "drought", "hurricane", "tornado", "tsunami", "headache", "fever",
      "cough", "allergy", "infection", "injury", "broken bone", "surgery", "treatment", "prescription",
      "pill", "vaccine", "checkup", "principal", "classmate", "homework", "score", "scholarship",
      "tuition", "textbook", "notebook", "calculator", "blackboard", "playground", "gymnasium", "laboratory",
      "cafeteria", "career", "profession", "occupation", "employee", "employer", "colleague", "client",
      "resume", "promotion", "bonus", "overtime", "retirement", "task", "responsibility", "happiness",
      "sadness", "anger", "sorrow", "disappointment", "excitement", "depression", "stress", "loneliness",
      "jealousy", "shame", "guilt", "envy", "gratitude", "sympathy", "empathy", "confidence",
      "patience", "imagination", "creativity", "inspiration", "motivation", "determination", "passion", "enthusiasm",
      "beauty", "ugliness", "wisdom", "ignorance", "failure", "fate", "destiny", "impossibility",
      "reality", "nightmare", "despair", "faith", "betrayal", "loyalty", "dishonor", "glory",
      "obstacle", "barrier", "boundary", "border", "beginning", "origin", "source", "impact",
      "development", "growth", "decline", "decrease", "improvement", "deterioration", "stability", "instability",
      "security", "safety", "protection", "defense", "offense", "strategy", "tactic", "technique",
      "system", "procedure", "criterion", "topic", "theme", "concept", "theory", "hypothesis",
      "evidence", "proof", "data", "routine", "ritual", "ceremony", "celebration", "occasion",
      "view", "landscape", "scenery", "image", "painting", "drawing", "sketch", "portrait",
      "mural", "sculpture", "statue", "artwork", "construction", "infrastructure", "facility", "equipment",
      "device", "gadget", "instrument", "appliance", "mechanism", "motor", "battery", "cable",
      "wire", "plug", "socket", "switch", "lever", "knob", "dial", "screen",
      "monitor", "keyboard", "printer", "scanner", "lens", "tripod", "microphone", "speaker",
      "headphone", "earphone", "radio", "television", "remote", "absent", "absolute", "abundant",
      "actual", "acute", "adjacent", "administrative", "advanced", "alive", "amateur", "anonymous",
      "anxious", "artificial", "asleep", "automatic", "awful", "backward", "bare", "bitter",
      "blank", "bold", "boring", "broad", "broken", "capable", "casual", "central",
      "charming", "civil", "classic", "clinical", "closed", "comfortable", "communist", "competitive",
      "confident", "conscious", "conservative", "constant", "content", "continuous", "convenient", "conventional",
      "corresponding", "costly", "creative", "criminal", "critical", "curved", "daily", "dangerous",
      "deaf", "decent", "definite", "delicate", "delicious", "democratic", "dense", "dependent",
      "desperate", "detailed", "digital", "disabled", "distant", "distinct", "diverse", "domestic",
      "dominant", "dramatic", "drunk", "due", "eager", "eastern", "economic", "educational",
      "effective", "efficient", "elderly", "electronic", "elegant", "emotional", "enormous", "environmental",
      "essential", "ethnic", "eventual", "evident", "evil", "excessive", "exclusive", "existing",
      "exotic", "expensive", "experienced", "experimental", "explicit", "extreme", "faint", "faithful",
      "false", "familiar", "fantastic", "fatal", "favorable", "federal", "female", "fierce",
      "financial", "firm", "fixed", "flexible", "fluent", "fond", "foolish", "formal",
      "former", "fortunate", "fragile", "frequent", "frightened", "frozen", "fundamental", "generous",
      "genuine", "giant", "gorgeous", "gradual", "grand", "grateful", "grave", "greedy",
      "gross", "guilty", "actually", "against", "ago", "although", "apart", "army",
      "artist", "attitude", "author", "award", "balance", "ban", "band", "bar",
      "battle", "besides", "beyond", "billion", "birth", "bit", "blade", "bomb",
      "bond", "branch", "brand", "breath", "brick", "brilliant", "burst", "bush",
      "cabin", "campus", "cancel", "cancer", "careless", "case", "cast", "castle",
      "category", "cell", "chain", "chairman", "champion", "channel", "chapter", "character",
      "charity", "chart", "cheek", "chief", "childhood", "cigarette", "cinema", "circle",
      "citizen", "classroom", "clerk", "cloth", "code", "column", "combination", "committee",
      "consumer", "contact", "contest", "cooperation", "cotton", "counter", "countryside", "county",
      "court", "creature", "credit", "crime", "crisis", "crop", "crystal", "currency",
      "cycle", "damp", "date", "demonstrate", "department", "deposit", "derive", "desire",
      "despite", "destination", "detail", "determine", "devote", "diamond", "diary", "difficulty",
      "dimension", "director", "disability", "disaster", "discipline", "discount", "discovery", "disorder",
      "distinguish", "district", "disturb", "division", "dominate", "draft", "drawer", "driver",
      "drown", "drug", "drum", "dump", "dwelling", "dynamic", "ease", "easily",
      "echo", "edition", "editor", "elder", "election", "electricity", "element", "eliminate",
      "elsewhere", "email", "embrace", "emergency", "emotion", "emphasis", "empire", "employment",
      "encounter", "engage", "ensure", "enterprise", "entertainment", "entrepreneur", "entry", "envelope",
      "episode", "establish", "estate", "estimate", "evaluate", "even", "eventually", "everybody",
      "evolution", "exactly", "examination", "executive", "exhibit", "exhibition", "existence", "expansion",
      "expert", "explanation", "explode", "explosion", "expression", "extension", "extensive", "extent",
      "external", "extraordinary", "extremely", "connect", "visual", "weekly", "steady", "こんにちは",
      "ありがとう", "学校", "練習", "会話", "目標", "hola", "gracias", "escuela",
      "practicar", "conversación", "objetivo"
    ],
  },
  {
    id: "upgrade",
    title: "专升本词汇",
    tag: "专升本",
    description: "强调考试常见动词、抽象名词和应用表达。622词",
    wordNames: [
      "sing", "single", "sir", "sister", "sit", "situation", "size", "skill",
      "skin", "sky", "sleep", "slow", "slowly", "small", "smart", "smell",
      "smile", "smoke", "snow", "so", "soft", "soldier", "solve", "some",
      "somebody", "someone", "something", "sometimes", "son", "song", "soon", "sort",
      "soul", "sound", "soup", "south", "space", "speak", "special", "speech",
      "speed", "spend", "spirit", "spoon", "sport", "spread", "spring", "square",
      "stage", "stand", "standard", "star", "start", "state", "station", "stay",
      "steal", "steam", "steel", "step", "stick", "still", "stomach", "stone",
      "stop", "store", "storm", "story", "strange", "stranger", "street", "strength",
      "strict", "strike", "strong", "structure", "student", "study", "stupid", "subject",
      "success", "such", "suddenly", "suffer", "sugar", "suggest", "suit", "summer",
      "sun", "supper", "supply", "support", "suppose", "sure", "surprise", "sweet",
      "swim", "table", "tail", "take", "talk", "tall", "taste", "taxi",
      "tea", "teach", "teacher", "team", "technology", "tell", "temperature", "ten",
      "tend", "term", "terrible", "test", "text", "than", "thank", "that",
      "the", "theater", "their", "them", "then", "there", "these", "they",
      "thick", "thin", "thing", "think", "third", "this", "those", "though",
      "thought", "thousand", "threat", "throat", "through", "throw", "thus", "ticket",
      "tidy", "tie", "tight", "till", "time", "tiny", "tired", "title",
      "today", "together", "tomorrow", "tongue", "tonight", "too", "tool", "tooth",
      "top", "total", "touch", "tough", "tour", "toward", "tower", "town",
      "toy", "track", "trade", "tradition", "traffic", "train", "training", "transfer",
      "travel", "treasure", "treat", "tree", "trip", "trouble", "truck", "true",
      "trust", "truth", "try", "turn", "twice", "type", "ugly", "uncle",
      "under", "understand", "university", "unless", "until", "up", "upon", "use",
      "used", "useful", "usual", "usually", "value", "variety", "very", "victory",
      "village", "visit", "voice", "wait", "wake", "walk", "wall", "want",
      "war", "warm", "warn", "wash", "waste", "watch", "water", "wave",
      "way", "we", "weak", "wealth", "weapon", "wear", "weather", "website",
      "wedding", "week", "weekend", "weigh", "weight", "welcome", "well", "west",
      "western", "wet", "what", "whatever", "when", "where", "whether", "which",
      "while", "white", "who", "whole", "whom", "whose", "why", "wide",
      "wife", "wild", "will", "win", "wind", "window", "wine", "wing",
      "winter", "wise", "wish", "with", "within", "without", "woman", "wonder",
      "wonderful", "wood", "word", "work", "worker", "world", "worry", "worse",
      "worst", "worth", "would", "wound", "wrap", "write", "wrong", "yard",
      "year", "yellow", "yes", "yesterday", "yet", "you", "young", "your",
      "youth", "zero", "zone", "alarm", "as", "at", "attack", "be",
      "but", "by", "can", "capital", "concern", "condition", "dad", "candy",
      "cookie", "ice cream", "soda", "beer", "elbow", "wrist", "thumb", "chest",
      "waist", "hip", "ankle", "toe", "muscle", "lung", "living room", "dining room",
      "garage", "balcony", "attic", "basement", "roof", "ceiling", "stairs", "elevator",
      "hallway", "closet", "fence", "driveway", "sofa", "couch", "bookshelf", "wardrobe",
      "dresser", "nightstand", "mirror", "lamp", "carpet", "curtain", "pillow", "blanket",
      "towel", "sink", "toilet", "shower", "bathtub", "oven", "stove", "microwave",
      "refrigerator", "dishwasher", "washing machine", "dryer", "vacuum", "subway", "bicycle", "motorcycle",
      "ambulance", "fire truck", "helicopter", "thunder", "lightning", "fog", "ice", "frost",
      "rainbow", "forecast", "climate", "dawn", "dusk", "midnight", "noon", "decade",
      "era", "anniversary", "vacation", "schedule", "calendar", "deadline", "argue", "disagree",
      "recommend", "forgive", "complain", "praise", "criticize", "request", "demand", "command",
      "instruction", "advice", "suggestion", "decision", "option", "possibility", "probability", "risk",
      "solution", "circumstance", "environment", "background", "tale", "myth", "legend", "mystery",
      "puzzle", "riddle", "trick", "humor", "comedy", "drama", "tragedy", "action",
      "romance", "fiction", "nonfiction", "poetry", "novel", "short story", "essay", "summary",
      "analysis", "exam", "quiz", "presentation", "lecture", "diploma", "certificate", "qualification",
      "talent", "ability", "weakness", "disadvantage", "benefit", "drawback", "characteristic", "expense",
      "budget", "income", "salary", "wage", "profit", "loss", "investment", "savings",
      "debt", "loan", "mortgage", "insurance", "tax", "bill", "receipt", "cash",
      "credit card", "bank account", "ATM", "exchange rate", "stock market", "economy", "corporation", "regulation",
      "policy", "agreement", "contract", "negotiation", "conference", "discussion", "conversation", "dialogue",
      "debate", "conflict", "justice", "equality", "democracy", "religion", "custom", "belief",
      "morality", "ethics", "philosophy", "engineering", "mathematics", "chemistry", "biology", "geography",
      "geology", "astronomy", "psychology", "sociology", "economics", "politics", "photography", "literature",
      "architecture", "fashion", "sports", "fitness", "nutrition", "cooking", "tourism", "climate change",
      "pollution", "recycling", "sustainability", "conservation", "ecology", "biodiversity", "apply", "behave",
      "belong", "bend", "bet", "bite", "blame", "bleed", "bless", "block",
      "boil", "bother", "bounce", "breathe", "broadcast", "bury", "calculate", "capture",
      "challenge", "chase", "cheat", "cheer", "clap", "click", "combine", "comfort",
      "comment", "commit", "communicate", "confuse", "crush", "cure", "dare", "declare",
      "decorate", "defeat", "defend", "define", "delay", "deliver", "deny", "deserve",
      "destroy", "detect", "disappear", "dismiss", "display", "distribute", "donate", "download",
      "drag", "educate", "elect", "embarrass", "emerge", "employ", "enable", "excite",
      "exclude", "execute", "expand", "explore", "export", "expose", "extend", "fade",
      "fancy", "flash", "float", "flow", "fold", "found", "freeze", "frighten",
      "generate", "glow", "govern", "grab", "graduate", "grant", "grasp", "handle",
      "hang", "harm", "heal", "honor", "import", "impress", "inherit", "injure",
      "insert", "inspect", "inspire", "install", "instruct", "insure", "integrate", "intend",
      "interrupt", "investigate", "involve", "isolate", "justify", "kick"
    ],
  },
]

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
  if (state.authUser?.username === "admin") return true;
  return state.authUser?.role === "admin";
}

function isSuperAdmin() {
  return state.authUser?.username === "admin";
}

function ensureSuperAdmin() {
  const users = state.registeredUsers || [];
  if (!users.find((u) => u.username === "admin")) {
    const admin = {
      id: "super-admin-001",
      username: "admin",
      email: "admin@linguaflow.local",
      passwordHash: localPasswordHash("123456"),
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    state.registeredUsers = [admin, ...users];
    saveState({ remote: false });
  }
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
    return activePack().words || [];
  }
  let baseWords;
  if (Object.prototype.hasOwnProperty.call(remoteBookWords, bookId)) {
    baseWords = Array.isArray(remoteBookWords[bookId]) ? remoteBookWords[bookId] : [];
  } else {
    baseWords = builtInWordsForBook(bookId);
  }
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
  const hour = new Date().getHours();
  let greeting = "晚上好";
  if (hour < 6) greeting = "夜深了";
  else if (hour < 12) greeting = "早上好";
  else if (hour < 14) greeting = "中午好";
  else if (hour < 18) greeting = "下午好";
  setTextIfPresent("#heroGreeting", greeting);
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
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  const wordList = allWords();
  const scopeTitle = currentLanguageKey() === "en" ? activeWordBook().title : activePack().label;
  const filtered = getFilteredLibraryWords();

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
  const grid = document.createElement("div");
  grid.className = "library-book-grid";
  for (const book of books) {
    try {
      const bookWords = currentLanguageKey() === "en" ? wordsForBook(book.id) : allWords();
      const studied = bookWords.filter((item) => progressFor(item.word)).length;
      const btn = document.createElement("button");
      btn.className = `library-book-card ${book.id === currentBookId() ? "active" : ""}`;
      btn.dataset.wordBook = book.id;
      btn.type = "button";
      btn.innerHTML = `
        <span>${escapeHtml(book.tag)}</span>
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.description)}</small>
        <em>${bookWords.length} 个单词</em>
        <small>${studied}/${bookWords.length} 已学习</small>
      `;
      grid.appendChild(btn);
    } catch (e) {
      console.warn("词书渲染失败:", book.id, e.message);
    }
  }
  const list = $("#libraryList");
  if (list) {
    list.innerHTML = "";
    list.appendChild(grid);
  }
  $("#libraryPagination").hidden = true;
}

function getFilteredLibraryWords() {
  const search = $("#librarySearchInput")?.value.trim().toLowerCase() || "";
  const level = $("#libraryLevelFilter")?.value || "all";
  return allWords()
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const matchesSearch = !search || item.word.toLowerCase().includes(search) || item.meaning.toLowerCase().includes(search);
      const matchesLevel = level === "all" || item.level === level;
      return matchesSearch && matchesLevel;
    });
}

function changeLibraryPage(delta) {
  const filtered = getFilteredLibraryWords();
  const totalPages = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
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
  try {
    const profile = await getProfile(supabaseUser.id).catch(() => null);
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
    await loadUserDataFromSupabase(supabaseUser.id);
  } catch (e) {
    console.warn("登录数据加载失败:", e.message);
  }
}

async function loadUserDataFromSupabase(userId) {
  const [progressRows, favorites, checkins, stats] = await Promise.all([
    loadUserProgress(userId).catch(() => []),
    loadUserFavorites(userId).catch(() => []),
    loadUserCheckins(userId).catch(() => []),
    loadUserStats(userId).catch(() => null),
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
  const fb = $("#adminUsersFeedback");

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
      if (fb) { fb.textContent = "已删除用户。"; fb.className = "feedback good"; }
    } catch (err) {
      if (fb) { fb.textContent = err.message; fb.className = "feedback bad"; }
    }
    return;
  }

  if (USE_SUPABASE) {
    if (fb) { fb.textContent = "Supabase 模式请在 Dashboard 管理用户。"; fb.className = "feedback"; }
    return;
  }

  const before = (state.registeredUsers || []).length;
  state.registeredUsers = (state.registeredUsers || []).filter((u) => (u.id || u.username) !== userId);
  const after = state.registeredUsers.length;
  saveState();
  renderAdminUserList();
  if (after < before) {
    if (fb) { fb.textContent = `已删除用户 ${userId}。`; fb.className = "feedback good"; }
  } else {
    if (fb) { fb.textContent = `未找到匹配的用户（ID: ${userId}）。`; fb.className = "feedback bad"; }
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
  renderView("admin");
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
  on("#generateTestDataButton", "click", generateTestData);
  on("#adminUserList", "click", (event) => {
    const btn = event.target.closest("[data-delete-user]");
    if (!btn) return;
    const userId = btn.dataset.deleteUser;
    if (!userId) return;
    if (confirm("确认删除该用户？此操作不可撤销。")) {
      deleteAdminUser(userId);
    }
  });
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

function renderView(viewId) {
  updateMetrics();
  switch (viewId) {
    case "dashboard":
      renderWordBooks();
      renderDailyPath();
      renderReviewQueue();
      renderSyncStatus();
      break;
    case "vocabulary":
      renderFlashcard();
      break;
    case "practice":
      renderPracticeQuiz();
      break;
    case "mistakes":
      renderMistakes();
      break;
    case "profile":
      renderUser();
      renderProfileDashboard();
      break;
    case "favorites":
      renderFavorites();
      break;
    case "library":
      renderLibrary();
      break;
    case "listening":
      renderListening();
      break;
    case "reading":
      renderReading();
      break;
    case "speaking":
      renderSpeaking();
      break;
    case "settings":
      applyPreferences();
      break;
    case "admin":
      renderAdmin();
      break;
    default:
      break;
  }
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

function generateTestData() {
  const wordList = allWords();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const testUsers = [
    { username: "admin", email: "admin@test.com", role: "admin" },
    { username: "zhangsan", email: "zhangsan@test.com", role: "learner" },
    { username: "lisi", email: "lisi@test.com", role: "learner" },
    { username: "wangwu", email: "wangwu@test.com", role: "learner" },
  ];

  testUsers.forEach((u, idx) => {
    if (!(state.registeredUsers || []).find((r) => r.username === u.username)) {
      const account = {
        id: `test-${u.username}-${now}`,
        username: u.username,
        email: u.email,
        passwordHash: localPasswordHash("123456"),
        role: u.role,
        createdAt: new Date(now - (30 - idx * 5) * day).toISOString(),
      };
      state.registeredUsers = [account, ...(state.registeredUsers || [])];
    }
  });

  const progressLevels = [45, 28, 15, 6];
  const myProgress = {};
  const myFavorites = [];
  const myCheckins = [];
  const limit = progressLevels[0];
  for (let i = 0; i < Math.min(limit, wordList.length); i++) {
    const w = wordList[i];
    const key = normalizeWord(w.word);
    const correct = 2 + Math.floor(Math.random() * 8);
    const wrong = Math.floor(Math.random() * 3);
    const mastery = Math.min(5, Math.floor(correct / 3));
    myProgress[key] = {
      word: key,
      correct,
      wrong,
      mastery,
      lastStudiedAt: new Date(now - Math.random() * 7 * day).toISOString(),
      nextReviewAt: new Date(now + Math.random() * 3 * day).toISOString(),
    };
    if (i < 5) myFavorites.push(w.word);
  }
  for (let d = 0; d < 14; d++) {
    if (Math.random() > 0.3) {
      const date = new Date(now - d * day).toISOString().slice(0, 10);
      myCheckins.push(date);
    }
  }

  state.wordProgress = { ...state.wordProgress, ...myProgress };
  state.favoriteWords = [...new Set([...(state.favoriteWords || []), ...myFavorites])];
  state.checkInDates = [...new Set([...(state.checkInDates || []), ...myCheckins])];
  state.minutes = 420 + Math.floor(Math.random() * 200);
  state.wordsLearned = limit;
  state.quizScore = limit * 10;
  state.streak = countCurrentStreak(state.checkInDates);
  state.answers = Array.from({ length: 20 }, () => Math.random() > 0.2);
  state.knownWords = wordList.slice(0, limit).map((w) => w.word);

  saveState();
  renderAll();
  const fb = $("#adminUsersFeedback");
  if (fb) {
    fb.textContent = `已生成 ${testUsers.length} 个测试账号（密码均为 123456），当前用户已填充 ${limit} 个单词学习进度。`;
    fb.className = "feedback good";
  }
}

bindEvents();
bindCheckInPopover();
ensureSuperAdmin();
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
