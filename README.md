# LinguaFlow 英语学习 APP

一个可直接运行的英语学习 Web/PWA 原型，包含桌面网页布局和手机端底部导航。

## 功能

- 今日学习计划与进度统计（每日路径、到期复习、周趋势）
- 单词卡 + SRS 间隔复习（认识/模糊/不认识，掌握度 0-5）
- 词库管理（搜索、添加单词、批量导入、词书切换）
- 选择题、拼写题、听力题练习与正确率统计
- 英文听写与浏览器语音朗读
- 阅读理解与生词摘录
- 口语跟读计时
- 错题本/复习中心（按题型筛选）
- 收藏夹
- 打卡签到 + 连续学习天数
- 用户认证（邮箱注册/登录，支持 Supabase Auth / Netlify Identity）
- 云端同步（localStorage + Supabase PostgreSQL，含冲突解决）
- 后台管理面板
- 离线可用（Service Worker PWA 缓存）
- 响应式布局（桌面侧边栏 + 手机底部导航）
- 多语言支持（英语/日语/西班牙语 UI 占位）
- Android WebView 打包
- GitHub Pages / Netlify 部署

## 项目结构

```
├── index.html                    # 主入口页面
├── app-entry.js                  # ES module 入口
├── app.js                        # 核心应用逻辑（DOM 渲染、事件绑定）
├── learning-core.mjs             # SRS 间隔复习算法（可测试纯函数）
├── daily-path-core.mjs           # 每日学习路径管理
├── sync-core.mjs                 # 同步冲突检测与解决
├── sync-client.mjs               # Netlify Identity 同步客户端
├── supabase-client.js            # Supabase 客户端封装（认证、数据库）
├── styles.css                    # 全局样式（咖啡馆主题）
├── sw.js                         # Service Worker 离线缓存
├── server.mjs                    # 本地开发服务器
├── manifest.webmanifest          # PWA 配置
├── netlify.toml                  # Netlify 部署配置
├── package.json                  # 项目依赖与脚本
│
├── assets/                       # SVG 图标与插画（17 个文件）
│   ├── nav-home-a.svg            # 首页导航图标
│   ├── nav-vocab-b.svg           # 单词学习导航图标
│   ├── nav-practice-c.svg        # 练习测试导航图标
│   ├── nav-mistakes-a.svg        # 错题本导航图标
│   ├── nav-profile-a.svg         # 我的导航图标
│   ├── study-cafe-desk.svg       # 咖啡馆学习桌面插画
│   ├── learner-hero.svg          # 学习者头图
│   ├── learner-avatar.svg        # 学习者头像
│   ├── menu-plan-a.svg           # 学习计划菜单图标
│   ├── menu-vocab-a.svg          # 生词本菜单图标
│   ├── menu-favorites-d.svg      # 收藏夹菜单图标
│   ├── menu-settings-b.svg       # 设置菜单图标
│   ├── menu-about-a.svg          # 关于菜单图标
│   ├── volume-d.svg              # 音量图标
│   ├── empty-bookmark.svg        # 收藏空状态插画
│   ├── empty-notebook.svg        # 笔记本空状态插画
│   └── empty-review.svg          # 复习空状态插画
│
├── icons/
│   └── icon.svg                  # PWA 应用图标
│
├── supabase/
│   └── schema.sql                # 数据库建表 + RLS 策略
│
├── netlify/
│   └── functions/
│       ├── auth.mjs              # 认证 API（注册/登录）
│       ├── admin.mjs             # 管理员 API（用户列表）
│       ├── learning-state.mjs    # 学习状态同步 API
│       └── _shared/
│           └── auth-store.mjs    # 认证存储共享模块
│
├── scripts/                      # 构建与测试脚本（14 个文件）
│   ├── build-static.mjs          # 静态资源构建
│   ├── sync-android-assets.mjs   # Android 资源同步
│   ├── smoke-test.mjs            # 冒烟测试
│   ├── learning-core-test.mjs    # 学习核心测试
│   ├── daily-path-core-test.mjs  # 每日路径测试
│   ├── sync-core-test.mjs        # 同步核心测试
│   ├── build-static-test.mjs     # 构建测试
│   ├── netlify-config-test.mjs   # Netlify 配置测试
│   ├── netlify-function-test.mjs # Netlify 函数测试
│   ├── service-worker-test.mjs   # Service Worker 测试
│   ├── ui-contract-test.mjs      # UI 契约测试
│   ├── import-kylebing-vocab.mjs # 词库导入脚本
│   ├── seed-supabase.mjs         # Supabase 种子数据导入
│   └── deploy-github-pages.ps1   # GitHub Pages 部署（PowerShell）
│
├── dist/                         # 静态构建输出（npm run build）
│
└── android/                      # Android 工程
    ├── settings.gradle
    ├── build.gradle
    ├── app/
    │   ├── build.gradle
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       ├── java/com/linguaflow/app/MainActivity.java
    │       ├── res/              # Android 资源（颜色、样式、图标）
    │       └── assets/www/       # 内置 WebView 资源（npm run android:sync）
    └── README.md
```

## 数据库表结构（Supabase）

| 表名 | 说明 | RLS |
|------|------|-----|
| `vocabulary` | 所有英语单词 | 公开读取 |
| `word_books` | 词书（中考/高考/CET4/CET6/专升本等） | 公开读取 |
| `book_words` | 词书-单词关联 | 公开读取 |
| `profiles` | 用户档案 | 仅本人可读写 |
| `user_progress` | 学习进度（SRS间隔复习） | 仅本人可读写 |
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
npm run dev
```

然后访问 `http://localhost:5173`。

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

先把网页资源同步进 Android 工程：

```powershell
npm run android:sync
```

然后用 Android Studio 打开 `android` 文件夹，等待 Gradle 同步完成后，选择：

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

生成的 APK 安装到手机后会直接打开内置应用页面，不需要访问网站地址。

## 部署到 GitHub Pages

在 PowerShell 里运行：

```powershell
.\scripts\deploy-github-pages.ps1
```

脚本会创建 GitHub 仓库、推送代码、开启 GitHub Pages，并输出 iPhone Safari 可打开的 HTTPS 地址。

## 部署到 Netlify

项目根目录包含 `netlify.toml`：

```toml
[build]
command = "npm run build"
publish = "dist"
```

Netlify Functions 提供认证和学习状态同步 API。

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

- Supabase：在 Table Editor 中将 `profiles` 表中对应用户的 `role` 字段改为 `admin`
- Netlify：用户名包含 `admin` 的账号会自动获得管理员角色
- 本地模式：用户名包含 `admin` 的账号会自动获得管理员角色
