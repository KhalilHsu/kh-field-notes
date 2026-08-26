---
title: 写了一个 Chrome 版的 Little Arc
date: 2026-04-28
tags: MACOS / CHROME / TOOLS / SWIFT
summary: 把用完即走的外部链接关进轻量缓冲窗口，让外链浏览体验更加无感与克制。
cover: media/minichrome-cover.png
---

作为一个用户，在 Arc 浏览器里我最喜欢的功能其实叫 **Little Arc**。

在日常使用中，我们经常会从各种应用点开大量用完即走的临时网页。Little Arc 能让这些页面在一个轻量弹窗里快速打开，看完随手关掉，不用堆积在浏览器窗口或侧边栏里。虽然 Chrome 也有侧边栏功能，但整体上并没有这种轻盈的体验。

为了在 Chrome 里找回这种克制的外链体验，我用 Chrome 插件配合系统做了一个 Mini Arc：[PeekLink（miniChrome）](https://github.com/KhalilHsu/miniChrome)。

![PeekLink 原生外链缓冲与轻量 Chrome 弹窗](media/minichrome-cover.png)

在核心体验设计上，我主要聚焦在一点：**尽量让整个体验更加无感**。

当你从外部应用点开链接时，它会自动呼出轻量小窗口，完整复用你真实的 Chrome 登录态、Cookie 和插件体系，不需要任何额外的操作成本。看完随手关掉；如果觉得内容需要深入阅读，也能一键直接移入 Chrome 主窗口成为常驻标签页。

把临时外链关进轻量缓冲区，把真正清爽、专注的标签页空间留给重要的事情。

> **项目地址**：[GitHub - KhalilHsu/miniChrome](https://github.com/KhalilHsu/miniChrome)
