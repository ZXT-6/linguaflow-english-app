# LinguaFlow 后端部署指南

## 概述

LinguaFlow 现已支持 [Supabase](https://supabase.com) 作为后端，提供：
- **真实用户认证**：邮箱 + 密码注册/登录
- **云端数据同步**：学习进度、收藏、打卡记录跨设备同步
- **完整英语词库**：KyleBing 词库（初中/高中/四级/六级/考研/托福/SAT，共 5万+ 词条）

## 前置条件

1. [Node.js](https://nodejs.org) >= 18
2. [Supabase 账号](https://supabase.com)（免费版即可）
3. Git

## 快速开始

### 1. 创建 Supabase 项目

1. 登录 [app.supabase.com](https://app.supabase.com)
2. 点击 "New project"
3. 输入项目名称（如 `linguaflow`），设置数据库密码
4. 创建完成后，进入 Settings → API
5. 记下 **Project URL** 和 **anon public key**

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（或直接修改 `index.html`）：

```bash
SUPABASE_URL=https://你的项目ID.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key（仅用于种子脚本，从 Supabase Settings → API 获取）
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase/schema.sql` 文件内容（全部复制粘贴执行）。

### 4. 配置前端

编辑 `index.html` 中的 Supabase 配置：

```html
<script>
  window.__LINGUAFLOW_SUPABASE_URL__ = "https://你的项目ID.supabase.co";
  window.__LINGUAFLOW_SUPABASE_ANON_KEY__ = "你的anon_key";
</script>
```

### 5. 安装依赖

```bash
npm install
```

### 6. 导入词库

```bash
# 从 KyleBing 仓库下载并转换词库
npm run vocab:import

# 种子数据导入 Supabase
npm run db:seed

# 或一步完成
npm run db:setup
```

### 7. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`，即可使用邮箱注册/登录。

## 项目结构（新增文件）

```
├── supabase/
│   └── schema.sql              # 数据库建表 + RLS 策略
├── supabase-client.js           # Supabase JS 客户端封装
├── scripts/
│   ├── import-kylebing-vocab.mjs # 词库下载 + 转换脚本
│   └── seed-supabase.mjs        # Supabase 种子数据导入
├── data/                        # 词库 JSON 文件（gitignore）
│   ├── all-vocabulary.json      # 全部词条
│   ├── vocab-*.json             # 各词书词条
│   └── books-index.json         # 词书索引
└── .env                         # 环境变量（gitignore）
```

## 数据库表结构

| 表名 | 说明 | RLS |
|------|------|-----|
| `vocabulary` | 所有英语单词 | 公开读取 |
| `word_books` | 词书（中考/高考/CET4等） | 公开读取 |
| `book_words` | 词书-单词关联 | 公开读取 |
| `profiles` | 用户档案 | 仅本人可读写 |
| `user_progress` | 学习进度（SRS间隔复习） | 仅本人可读写 |
| `user_favorites` | 收藏单词 | 仅本人可读写 |
| `user_checkins` | 每日打卡记录 | 仅本人可读写 |
| `user_stats` | 学习统计汇总 | 仅本人可读写 |

## 工作模式

### Supabase 模式（配置了 `SUPABASE_URL`）
- 认证：Supabase Auth（邮箱 + 密码）
- 存储：localStorage（本地缓存） + Supabase PostgreSQL（云端同步）
- 同步：登录后自动拉取云端数据，操作后 2 秒去抖写入云端

### 离线模式（未配置 Supabase）
- 认证：本地模拟（用户名 + 密码）
- 存储：仅 localStorage
- 功能：完整可用，只是无云端同步

## 管理员设置

在 Supabase Table Editor 中，将 `profiles` 表中对应用户的 `role` 字段改为 `admin`。

## Netlify 部署

现有 Netlify 部署仍然兼容。Supabase 配置通过 `index.html` 中的全局变量注入，无需修改 `netlify.toml`。

## 常见问题

**Q: 种子导入失败？**
A: 确保已设置 `SUPABASE_SERVICE_KEY` 环境变量，且 `schema.sql` 已在 Supabase 执行。

**Q: 注册后无法登录？**
A: Supabase 默认要求邮箱确认。可在 Supabase Dashboard → Authentication → Settings 中关闭 "Confirm email"。

**Q: 词库下载失败？**
A: 可能是网络问题。可手动从 https://github.com/KyleBing/english-vocabulary 下载 JSON 文件放到 `data/` 目录。
