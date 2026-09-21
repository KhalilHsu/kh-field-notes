---
title: Building "Little Arc" for Google Chrome
date: 2026-04-28
tags: MACOS / CHROME / TOOLS / SWIFT
summary: Keeping ephemeral web pages inside temporary popups—restrained, friction-free link browsing.
cover: minichrome-cover.png
---

As a hardcore Arc power user, my single favorite feature has always been **Little Arc**.

Throughout the day, we click open dozens of disposable, one-off web pages from Slack, messaging apps, and docs. Little Arc lets these pages open in a floating, lightweight modal that you can read and discard immediately, without cluttering your main browser windows or sidebar tabs.

To bring that clean, restrained experience over to Google Chrome, I paired a Chrome extension with native macOS hooks to build miniChrome: [PeekLink](https://github.com/KhalilHsu/miniChrome).

![PeekLink Native Link Buffer and Lightweight Chrome Window](minichrome-cover.png)

The core product design revolves around one principle: **keep the interaction invisible**.

When you click an external link, it opens instantly inside an ephemeral, minimalist popup. Because it runs on your actual Chrome instance, you get full access to your existing cookies, active logins, password autofill, and extensions without friction. Read it, hit `Esc` or close it, and move on. If an article turns out to be worth a deeper read, a single shortcut promotes it directly into your primary Chrome window as a persistent tab.

Contain disposable web pages in a lightweight buffer, and keep your primary workspace focused and uncluttered.

> **Repository**: [GitHub - KhalilHsu/miniChrome](https://github.com/KhalilHsu/miniChrome)  
> **Official Site**: [PeekLink Homepage](https://khalilhsu.github.io/miniChrome/)
