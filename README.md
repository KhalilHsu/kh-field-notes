# Khalil's Random Shit

一个安静、文字优先的纯静态个人博客。

文章以 `content/*.md` 为唯一内容源，构建脚本编译输出至 `dist/`，无 CMS、无数据库、无后端。原生内置 **经典报刊 (Editorial)**、**画报潮流 (Magazine)**、**深潜终端 (Cyberdeck)** 三种视觉主题，并配备支持边缘吸附与持久化记忆的全局悬浮切换器。

---

## 项目结构

```text
khalil-random-shit/
├── build.mjs              # 构建入口（含 --watch 热重建）
├── package.json
├── content/               # 所有内容源（这里是唯一要编辑的地方）
│   ├── *.md               # 文章，文件名即 URL Slug
│   ├── media/             # 文章配图与视频
│   └── favicon.*          # 各格式网站图标
├── src/                   # 构建源码
│   ├── parser.mjs         # Markdown 解析（Front Matter / paragraphize）
│   ├── template.mjs       # HTML 模板（shell / header / postItem / archiveItem）
│   └── styles/
│       ├── base.css       # Reset + 浮动 Dock 通用样式
│       ├── editorial.css  # 经典报刊主题
│       ├── magazine.css   # 画报潮流主题
│       ├── cyberdeck.css  # 深潜终端主题
│       └── responsive.css # 响应式断点
└── dist/                  # 构建产物（自动生成，不要手动编辑）
```

---

## 撰写文章

在 `content/` 下新建 `.md` 文件（**文件名即文章 URL**），头部填入 Front Matter：

```md
---
title: 文章标题
date: 2026-08-24
tags: AI / TOOLS / INTERFACE
summary: 简短的一句话摘要，展示在首页列表和文章导语中。
cover: media/my-post-cover.png
---

这里开始写正文...
```

### Front Matter 字段说明

| 字段 | 必填 | 说明 |
| :--- | :---: | :--- |
| `title` | ✅ | 文章主标题 |
| `date` | ✅ | 发布日期，格式 `YYYY-MM-DD`，影响排序 |
| `tags` | ✅ | 标签，多个用 ` / ` 分隔，自动解析为徽标 |
| `summary` | ✅ | 首页摘要与文章导语 |
| `cover` | — | 封面图路径（相对 `content/`），留空时自动回退到默认占位图 |

> **关于封面图的跨主题表现**
> - **Editorial（报刊）**：强制 `3:2` 比例裁切（`object-fit: cover`）
> - **Magazine（画报）**：保持原始宽高比（`height: auto`）
> - **Cyberdeck（终端）**：固定 `3:2` 裁切并叠加扫描质感滤镜
>
> 建议封面图主体内容居中，以在各主题下均获得良好效果。

---

## 媒体与排版能力

所有本地媒体放入 `content/media/`，构建时自动同步至 `dist/media/`。

### 图片
```md
![图片说明](media/my-screenshot.png)
```

### 视频（.mp4 / .mov / .webm）
```md
@video[视频说明](media/demo.mp4)
```
直接使用标准图片语法引用视频格式文件也会自动识别为视频。

### 多图/视频并排网格
同一段落内放置多个媒体标签，自动渲染为 2 列网格：
```md
![收起状态](media/collapse.png)
![展开状态](media/expand.png)
```

### 代码块 / 行内代码 / 外链
- 代码块：标准 ` ```lang ` 语法，自动生成语法容器
- 行内代码：`` `code` ``
- 外链：`[文本](https://...)` —— 自动添加 `target="_blank" rel="noopener"`
- 粗体：`**粗体**`

---

## 本地开发

```sh
npm run dev       # 构建 + watch + 静态服务器 http://localhost:8080
npm run watch     # 仅构建 + watch（不启动服务器）
npm run build     # 单次构建
```

`--watch` 模式同时监听 `content/` 和 `src/styles/`，编辑文章或修改 CSS 均会自动重建。

---

## 部署

`npm run build` 生成 `dist/`，直接发布该目录：

- **GitHub Pages**：推送到 `gh-pages` 分支，或在 Actions 中发布 `dist/`
- **Cloudflare Pages**：构建命令 `npm run build`，输出目录 `dist`

---

## 修改主题样式

每个主题对应 `src/styles/` 下的独立 CSS 文件，直接编辑对应文件，`npm run watch` 会自动重建：

| 文件 | 对应主题 |
| :--- | :--- |
| `src/styles/editorial.css` | 经典报刊（默认） |
| `src/styles/magazine.css` | 画报潮流 |
| `src/styles/cyberdeck.css` | 深潜终端 |
| `src/styles/base.css` | 通用 Reset + 浮动 Dock |
| `src/styles/responsive.css` | 响应式断点 |

---

## 架构约束

- **不要引入**打包工具（Vite、webpack）、CMS、数据库或服务端运行时
- **不要手动编辑** `dist/`，它在每次构建时会被完整清空重建
- **状态极简**：仅用 `localStorage` 记录主题偏好（`kh-theme`）和悬浮 Dock 位置（`kh-dock-pos`）
- **未经明确授权，不推送至公网**
