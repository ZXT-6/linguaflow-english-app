# LinguaFlow 英语学习 APP

一个可直接运行的英语学习 Web/PWA 原型，包含桌面网页布局和手机端底部导航。

## 功能

- 今日学习计划与进度统计
- 单词卡、词库、掌握状态
- 选择题练习与正确率统计
- 英文听写与浏览器语音朗读
- 阅读理解与生词摘录
- 口语跟读计时
- 本地进度保存和 PWA 安装配置

## 本地运行

```powershell
npm run dev
```

然后访问 `http://localhost:5173`。

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
