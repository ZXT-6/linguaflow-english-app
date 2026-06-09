# LinguaFlow 英语学习 APP

一个手机优先、电脑端自适应的英语学习 Web/PWA，采用"咖啡绅士"浅色杂志风格 UI，全站中文界面。帮助用户完成每日英语学习闭环：单词闪卡、练习测试、错题复习、听力听写、口语跟读、阅读理解。

## 核心功能

- **今日学习首页** — 每日学习路径（复习→新词→听写→口语）、打卡日历、连续学习天数
- **单词卡** — 翻转/朗读/收藏/掌握度标记，SRS 间隔复习算法
- **词库管理** — KyleBing 标准词库 2500+ 词，6 本词书（中考/高考/四级/六级/专升本/普通学习），搜索/筛选/分页
- **练习测试** — 选择题、拼写题、听力题，自动跳题
- **听力训练** — 听写训练（播放→输入→检查）
- **口语跟读** — 跟读计时，浏览器语音朗读
- **阅读理解** — 短文阅读 + 选择题 + 生词摘录
- **错题本** — 按题型筛选，复习等级标注
- **收藏夹** — 收藏单词管理
- **后台管理** — 管理员用户管理（删除用户）、内容维护、测试数据生成
- **用户认证** — 邮箱注册/登录，忘记密码重置
- **云端同步** — Supabase PostgreSQL 数据同步（学习进度/收藏/打卡/统计）
- **离线可用** — Service Worker PWA 缓存
- **响应式布局** — 桌面侧边栏 + 手机底部导航

## 技术栈

| 领域 | 技术 |
|------|------|
| 前端 | 纯原生 HTML + CSS + JavaScript (ES Modules)，零框架 |
| 后端/数据库 | Supabase（PostgreSQL + Auth + RLS） |
| 本地缓存 | localStorage（离线可用） |
| CDN 依赖 | `esm.sh/@supabase/supabase-js@2`（动态加载） |
| 部署 | Netlify（静态站点 + Functions） |
| PWA | Service Worker + Web App Manifest |
| 语音 | Web Speech API |
| 测试 | Node.js 脚本测试 |
| Android | 原生 WebView 壳（Gradle, compileSdk 35） |
| 开发服务器 | 自定义 Node.js HTTP 服务器（端口 5173） |

## 项目结构

```
├── index.html                    # 主入口页面（登录壳 + App壳 + 全部视图）
├── app-entry.js                  # ES module 入口（绕开 SW 缓存）
├── app.js                        # 核心应用逻辑（状态/渲染/认证/交互）
├── supabase-client.js            # Supabase 客户端封装（认证、数据 CRUD）
├── learning-core.mjs             # SRS 间隔复习算法
├── daily-path-core.mjs           # 每日学习路径管理
├── sync-core.mjs                 # 同步冲突检测与解决
├── sync-client.mjs               # Netlify Identity 同步客户端（离线模式用）
├── styles.css                    # 全局样式（咖啡绅士毛玻璃风格）
├── sw.js                         # Service Worker 离线缓存
├── server.mjs                    # 本地开发服务器（端口 5173）
├── manifest.webmanifest          # PWA 配置
├── netlify.toml                  # Netlify 部署配置
├── package.json                  # 项目依赖与脚本
├── SETUP.md                      # Supabase 后端部署指南
├── PROJECT_HANDOFF.md            # 项目交接文档
│
├── assets/                       # SVG 图标与插画（22 个文件）
│   ├── nav-home-a.svg            # 首页导航图标
│   ├── nav-vocab-b.svg           # 单词学习导航图标
│   ├── nav-practice-c.svg        # 练习测试导航图标
│   ├── nav-listen-a.svg          # 听写训练导航图标
│   ├── nav-reading-a.svg         # 阅读训练导航图标
│   ├── nav-speaking-a.svg        # 口语训练导航图标
│   ├── nav-mistakes-a.svg        # 复习中心导航图标
│   ├── nav-favorites-a.svg       # 收藏夹导航图标
│   ├── nav-library-a.svg         # 词库导航图标
│   ├── nav-admin-a.svg           # 后台管理导航图标
│   ├── nav-settings-a.svg        # 设置导航图标
│   ├── nav-profile-a.svg         # 我的导航图标
│   ├── study-cafe-desk.svg       # 咖啡绅士学习桌面插画
│   ├── learner-hero.svg          # 学习者头图
│   ├── learner-avatar.svg        # 学习者头像
│   ├── volume-d.svg              # 音量图标
│   ├── empty-bookmark.svg        # 收藏空状态插画
│   ├── empty-notebook.svg        # 笔记本空状态插画
│   └── empty-review.svg          # 复习空状态插画
│
├── icons/
│   └── icon.svg                  # PWA 应用图标
│
├── supabase/
│   └── schema.sql                # 数据库建表 + RLS 策略（8张表）
│
├── netlify/
│   └── functions/
│       ├── auth.mjs              # 认证 API（注册/登录）
│       ├── admin.mjs             # 管理员 API（用户列表）
│       ├── learning-state.mjs    # 学习状态同步 API
│       └── _shared/
│           └── auth-store.mjs    # 认证存储共享模块
│
├── scripts/                      # 构建、测试、数据脚本
│   ├── build-static.mjs          # 静态资源构建
│   ├── import-kylebing-vocab.mjs # KyleBing 词库下载 + 转换
│   ├── seed-supabase.mjs         # Supabase 种子数据导入
│   ├── sync-android-assets.mjs   # Android 资源同步
│   ├── deploy-github-pages.ps1   # GitHub Pages 部署
│   ├── smoke-test.mjs            # 冒烟测试
│   ├── learning-core-test.mjs    # 学习核心测试
│   ├── daily-path-core-test.mjs  # 每日路径测试
│   ├── sync-core-test.mjs        # 同步核心测试
│   ├── build-static-test.mjs     # 构建测试
│   ├── ui-contract-test.mjs      # UI 契约测试
│   └── ...（其他测试脚本）
│
├── data/                         # 词库数据文件（gitignore）
│   ├── all-vocab.json            # 全部词条（2500+ 词）
│   ├── vocab-*.json              # 各词书独立词条
│   └── books-index.json          # 词书元数据索引
│
├── dist/                         # 静态构建输出（npm run build）
│
└── android/                      # Android WebView 工程
    ├── settings.gradle
    ├── build.gradle
    └── app/
        ├── build.gradle
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/com/linguaflow/app/MainActivity.java
            ├── res/              # Android 资源
            └── assets/www/       # 内置 WebView 资源
```

## 词库体系

| 词书 | 词条数 | 难度 |
|------|--------|------|
| 普通学习 | 2500+（全部） | A1-B2 |
| 中考词汇 | ~600 | A1 |
| 高考词汇 | ~600 | A2 |
| 四级词汇 | ~600 | B1 |
| 六级词汇 | ~600 | B1-B2 |
| 专升本词汇 | ~600 | A2-B1 |

来源：[KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary) 词库，通过 `npm run vocab:import` 下载并转换。

## 数据库表结构（Supabase）

| 表名 | 说明 | RLS |
|------|------|-----|
| `vocabulary` | 所有英语单词 | 公开读取 |
| `word_books` | 词书（中考/高考/CET4/CET6/专升本等） | 公开读取 |
| `book_words` | 词书-单词关联 | 公开读取 |
| `profiles` | 用户档案 | 仅本人可读写 |
| `user_progress` | 学习进度（SRS 间隔复习） | 仅本人可读写 |
| `user_favorites` | 收藏单词 | 仅本人可读写 |
| `user_checkins` | 每日打卡记录 | 仅本人可读写 |
| `user_stats` | 学习统计汇总 | 仅本人可读写 |

## 学习算法

`learning-core.mjs` 实现了 SRS 间隔复习算法：

- 答对 → 掌握度 +1（最高 5），复习间隔按阶梯递增：0h → 24h → 72h → 168h → 336h → 720h
- 答错 → 掌握度 -1（最低 0），复习间隔设为 6 小时
- `buildReviewQueue` 按到期 > 新词 > 已安排的优先级返回复习队列
- `calculateLearningStats` 统计总词数、已学、已掌握、到期复习数、正确率

## 本地运行

```powershell
npm install
npm run dev
```

然后访问 `http://localhost:5173`。

### 首次设置 Supabase 后端

1. 在 [app.supabase.com](https://app.supabase.com) 创建项目
2. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`
3. 修改 `index.html` 中的 `__LINGUAFLOW_SUPABASE_URL__` 和 `__LINGUAFLOW_SUPABASE_ANON_KEY__`
4. `npm run db:setup`（下载词库 + 导入 Supabase）

详见 `SETUP.md`。

## 测试

```powershell
# 语法检查
npm run check

# 核心逻辑测试
npm test

# 冒烟测试（启动服务器 + 页面检查）
npm run smoke
```

## 打包成 Android 应用

```powershell
npm run android:sync
```

然后用 Android Studio 打开 `android` 文件夹，等待 Gradle 同步完成后，选择：

```
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 部署到 Netlify

项目根目录包含 `netlify.toml`：

```toml
[build]
command = "npm run build"
publish = "dist"
```

Netlify 自动从 GitHub `main` 分支部署。Netlify Functions 提供认证和学习状态同步 API。

## 工作模式

### Supabase 模式（配置了 Supabase）
- 认证：Supabase Auth（邮箱 + 密码）
- 存储：localStorage（本地缓存） + Supabase PostgreSQL（云端同步）
- 同步：登录后自动拉取云端数据，操作后 2 秒去抖写入云端

### Netlify 模式（已部署到 Netlify，未配置 Supabase）
- 认证：Netlify Identity（邮箱 + 密码）
- 存储：Netlify Blobs

### 离线模式（本地运行，未配置任何后端）
- 认证：本地模拟（用户名 + 密码）
- 存储：仅 localStorage
- 功能：完整可用，只是无云端同步

## 管理员设置

- **本地模式**：注册时用户名包含 `admin`（如 `admin`、`admin123`），密码 `123456`
- **Supabase**：在 Table Editor 中将 `profiles` 表中对应用户的 `role` 字段改为 `admin`
- **Netlify**：用户名包含 `admin` 的账号会自动获得管理员角色

## 命令速查

```bash
npm run dev          # 启动开发服务器 → http://localhost:5173
npm run build        # 静态构建到 dist/
npm run check        # 语法检查所有 JS/MJS 文件
npm test             # 运行全部测试
npm run smoke        # 冒烟测试
npm run android:sync # 同步 Web 资源到 Android WebView
npm run vocab:import # 下载 KyleBing 词库并转换
npm run db:seed      # 将词库种子数据导入 Supabase
npm run db:setup     # vocab:import + db:seed 一步完成
```

## 公网地址

```
https://802c7ac1-83c6-4d4e-8bd7-938317b73900.netlify.app
```

## 设计风格

- **配色**：咖啡绅士风格 — 深棕 `#5c3d2e`、拿铁 `#c4956a`、黄铜金 `#b8965a`、酒红 `#6b2d3e`、森林绿 `#2d4a3a`
- **字体**：Georgia 衬线体
- **效果**：毛玻璃面板（`backdrop-filter: blur(20px)`）、弹性悬浮动效、渐变按钮
- **插画**：咖啡杯、书本、钢笔、笔记本的 SVG 线稿插画

## 项目文档

- `README.md` — 本文件
- `SETUP.md` — Supabase 后端部署指南
- `PROJECT_HANDOFF.md` — 项目交接文档（架构/代码/待办事项）
