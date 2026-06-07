# 本地学习产品化设计

## 目标

把 LinguaFlow 从静态原型推进成可持续迭代的英语学习应用第一阶段：用户不依赖服务器也能完成每日学习、复习、词库管理和进度跟踪。后端同步在下一阶段接入，本阶段先保证 Web/PWA 与 Android WebView 都稳定可用。

## 范围

本阶段实现本地优先的学习核心：

- 单词学习进度按单词记录，包含正确次数、错误次数、掌握等级、下次复习时间和最近学习时间。
- 首页展示更有意义的学习状态：今日任务、到期复习、掌握单词、正确率和连续学习。
- 选择题、单词卡“认识”、听写检查会更新学习记录。
- 词库能显示每个单词的掌握状态，用户能从词库进入学习。
- 所有数据继续保存在 `localStorage`，保证离线和 Android assets 内置页面可用。

不在本阶段实现：

- 真实短信、邮件或第三方登录。
- 云端数据库、支付、教师端、课程后台。
- 大规模重构为 React 或其他框架。

## 架构

保留现有无构建工具结构。新增 `learning-core.mjs`，专门承载可测试的学习算法，包括复习间隔、统计计算和学习记录更新。`app.js` 继续负责 DOM 渲染和事件绑定，但学习数据更新改为调用核心函数。

浏览器入口改为模块脚本，让 `app.js` 可以从 `learning-core.mjs` 导入函数。Service worker、Android 同步脚本和 smoke test 增加这个新资源，避免 Web 与 Android 版本不同步。

## 数据流

`localStorage` 中的状态增加 `wordProgress` 字段：

```json
{
  "wordProgress": {
    "focus": {
      "word": "focus",
      "correct": 2,
      "wrong": 1,
      "mastery": 2,
      "lastStudiedAt": "2026-06-02T00:00:00.000Z",
      "nextReviewAt": "2026-06-05T00:00:00.000Z"
    }
  }
}
```

答题正确、认识单词、听写正确会提升掌握等级并推迟复习时间。答题错误或听写错误会降低掌握等级，并把复习时间放到更近。统计从 `wordProgress` 与答题记录中计算，不再只依赖粗略计数。

## 组件

- `learning-core.mjs`：纯函数，负责学习记录、复习队列、统计。
- `app.js`：读取状态、渲染页面、处理用户事件、调用核心函数、保存状态。
- `index.html`：补充首页复习区和脚本模块类型。
- `styles.css`：补充复习区、掌握状态标签、统计细节样式。
- `scripts/smoke-test.mjs`：检查新增资源和关键页面文案。
- `scripts/sync-android-assets.mjs`：同步新增核心文件。
- `sw.js`：缓存新增核心文件并提升缓存版本。

## 错误处理

如果旧用户状态没有 `wordProgress`，应用启动时自动使用空对象。读取 `localStorage` 失败时继续使用默认状态。复习队列为空时显示空状态，而不是渲染空白区域。浏览器不支持语音朗读时保留现有提示。

## 测试

新增 `scripts/learning-core-test.mjs`，用 Node 直接测试核心函数：

- 正确回答会提升掌握度并设置未来复习时间。
- 错误回答会降低掌握度并设置较近复习时间。
- 到期复习队列优先返回已到期单词。
- 统计能根据学习记录计算掌握数量和到期数量。

`npm run check` 增加核心文件和测试文件语法检查。新增 `npm test` 运行核心测试。`npm run smoke` 继续启动本地服务器并检查页面资源。

## 发布影响

Web 版本仍然用 `npm run dev` 本地运行。Android 版本仍然通过 `npm run android:sync` 同步静态资源，再用 Android Studio 构建。新增文件会进入 PWA 缓存和 Android assets。
