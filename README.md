# KH Field Notes

一个安静、文字优先的纯静态个人博客。文章以 `content/*.md` 为唯一内容源，单文件构建脚本编译输出至 `dist/`。

原生内置 **经典报刊 (Editorial)**、**画报潮流 (Magazine)** 与 **深潜终端 (Cyberdeck)** 三种视觉主题，并配备支持边缘吸附与持久化记忆的全局悬浮切换器。

---

## 撰写与发布文章

在 `content/` 目录下新建 Markdown 文件（如 `content/my-new-post.md`，文件名将直接作为文章的 URL Slug），头部填入 Front Matter 元数据：

```md
---
title: 文章标题
date: 2026-08-24
tags: AI / TOOLS / INTERFACE
summary: 简短的一句话摘要，会展示在首页文章列表与文章导语中。
cover: media/my-post-cover.png
---

这里开始写正文内容...
```

### 字段说明与规则

- **`title`**：文章主标题。
- **`date`**：发布日期，格式固定为 `YYYY-MM-DD`。
- **`tags`**：文章标签，多个标签使用 ` / ` 分隔，构建时会自动解析为多标签徽标。
- **`summary`**：文章导语与列表摘要。
- **`cover`**：首页列表封面图（独立于正文）。若暂无封面，系统会自动回退使用默认中性占位封面。

> **⚠️ 注意：多主题下的封面/图片展示比例并不一致**
> 不同主题为了契合各自的设计语言，对封面图有不同的渲染策略：
> - **经典报刊 (Editorial)**：强制采用 **`3:2`** 比例裁切（`object-fit: cover`），追求报刊式严整对齐；
> - **画报潮流 (Magazine)**：保持图片**原始宽高比**（`height: auto`），完整呈现视觉内容；
> - **深潜终端 (Cyberdeck)**：采用宽屏 **`16:9`** 比例并叠加终端滤镜与扫描质感。
> 
> 建议封面图主体内容尽量居中，以在各个主题下均能获得良好的视觉效果。

---

## 媒体与排版能力

所有本地媒体资源请统一存放在 `content/media/` 目录下。

### 1. 插入图片
```md
![图片说明](media/my-screenshot.png)
```
构建时会自动将图片同步至 `dist/media/`，并在图片下方渲染图注（Caption）。

### 2. 插入视频
直接引用常见视频格式（`.mp4`、`.mov`、`.webm`）或使用 `@video` 前缀语法：
```md
@video[视频交互演示](media/demo-video.mp4)
```

### 3. 多图 / 视频并排网格
在同一段落内连续放置多个媒体标签，构建时会自动将其渲染为并排的 `.media-grid` 网格布局：
```md
![界面收起状态](media/screen-collapse.png)
![界面展开状态](media/screen-expand.png)
```

### 4. 代码块与外链
- **代码块**：支持使用 ` ```lang ` 标记代码块语言，自动生成对应语法容器。
- **外链**：支持标准 Markdown 链接 `[文本](https://...)`，外部媒体链接也会自动识别。

---

## 本地预览与调试

```sh
npm run dev
```

构建站点并在本地启动静态服务器，浏览器打开 `http://localhost:3000/` 即可实时预览。

---

## 构建与部署

```sh
npm run build
```

执行静态构建，编译生成的 `dist/` 文件夹为纯静态产物：
- **GitHub Pages**：可直接推送到 `gh-pages` 分支或在 GitHub Actions 中发布 `dist/` 目录；
- **Cloudflare Pages**：构建命令填写 `npm run build`，输出目录填写 `dist`。

---

## 架构与维护原则

- **纯静态与单脚本**：保持 `scripts/build.mjs` 单文件静态生成逻辑，不引入复杂的第三方打包工具、CMS 或后端数据库。
- **状态轻量化**：仅在客户端通过 `localStorage` 记录用户的主题偏好（`kh-theme`）及悬浮切换器位置（`kh-dock-pos`）。
- **安全发布**：未经明确授权，不将草稿或本地私有改动推送至公网。
