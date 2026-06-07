# 本地学习产品化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建本地优先的学习核心，让 LinguaFlow 能跟踪单词掌握度、生成复习队列并展示更有意义的学习状态。

**Architecture:** 保留当前静态 Web/PWA 架构，新增一个可测试的 `learning-core.mjs` 模块承载学习算法。`app.js` 继续负责界面和事件，但所有学习进度计算都调用核心模块。Android assets、service worker 和 smoke test 同步新增资源。

**Tech Stack:** 原生 HTML/CSS/JavaScript、ES modules、Node 脚本测试、localStorage、Android WebView assets。

---

## File Structure

- Create: `learning-core.mjs`，学习记录、复习间隔、队列和统计的纯函数。
- Create: `scripts/learning-core-test.mjs`，核心逻辑测试。
- Modify: `package.json`，增加 `npm test`，并把新增文件纳入 `check`。
- Modify: `index.html`，增加首页复习区，脚本改为模块加载。
- Modify: `app.js`，导入核心函数，接入 `wordProgress`，在答题、认识、听写后更新进度。
- Modify: `styles.css`，补充复习区和掌握状态样式。
- Modify: `sw.js`，缓存新增模块并提升版本。
- Modify: `scripts/sync-android-assets.mjs`，同步新增模块。
- Modify: `scripts/smoke-test.mjs`，检查新增模块可访问。

### Task 1: 学习核心模块

**Files:**
- Create: `learning-core.mjs`
- Create: `scripts/learning-core-test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create tests covering progress update, due review queue and stats calculation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `learning-core.mjs` does not exist yet.

- [ ] **Step 3: Implement core functions**

Implement `updateWordProgress`, `buildReviewQueue`, `calculateLearningStats`, `getMasteryLabel`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS with all learning-core tests passing.

### Task 2: 页面接入学习核心

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add dashboard review markup**

Add a review queue panel on the dashboard and load `app.js` as a module.

- [ ] **Step 2: Wire app state to core functions**

Add `wordProgress` to default state and call `updateWordProgress` from quiz, flashcard and dictation flows.

- [ ] **Step 3: Render review queue and mastery labels**

Use `buildReviewQueue` and `calculateLearningStats` during render, with empty states.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

### Task 3: 静态资源同步和验证

**Files:**
- Modify: `sw.js`
- Modify: `scripts/sync-android-assets.mjs`
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1: Update resource manifests**

Add `learning-core.mjs` to service worker cache, Android sync file list and smoke checks.

- [ ] **Step 2: Run syntax and smoke checks**

Run: `npm run check`
Expected: exit 0.

Run: `npm run smoke`
Expected: `Smoke test passed`.

- [ ] **Step 3: Sync Android assets**

Run: `npm run android:sync`
Expected: assets copied, including `learning-core.mjs`.

### Task 4: 浏览器验证

**Files:**
- No source changes expected.

- [ ] **Step 1: Start local dev server**

Run: `npm run dev`
Expected: server listening on `http://localhost:5173`.

- [ ] **Step 2: Open app and inspect key flows**

Verify dashboard, quiz, vocabulary, library and listening pages render without blank screens.

- [ ] **Step 3: Stop server**

Stop the local dev server after verification.
