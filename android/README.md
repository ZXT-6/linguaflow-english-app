# LinguaFlow Android

这是 LinguaFlow 的 Android 原生壳工程。应用启动后会加载 `app/src/main/assets/www/index.html`，不需要访问 `localhost` 或任何网站地址。

## 更新应用内容

在项目根目录运行：

```powershell
npm run android:sync
```

这个命令会把根目录的网页资源复制到 Android assets。

## 构建 APK

这台环境当前没有 Android SDK 和 Gradle，所以不能直接在命令行生成 APK。安装 Android Studio 后：

1. 打开 `D:\codex_project\英语学习APP\android`
2. 等待 Gradle Sync 完成
3. 选择 `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. 把生成的 APK 安装到 Android 手机

如果 Android Studio 提示缺少 SDK 或 Gradle 插件，按它的提示安装即可。
