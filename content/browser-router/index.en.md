---
title: Why Are We Still Limited to a Single Default Browser?
date: 2026-04-16
tags: MACOS / TOOLS / SWIFT
summary: Built a tool to automatically route external URLs to the right browser and profile based on context.
cover: browser-router-cover.png
---

I think macOS's definition of a "default browser" is still stuck in the single-choice era, which completely clashes with modern multi-context workflows.

In real life, many of us maintain multiple Chrome Profiles. But clicking an external link from another app never lands smartly in the profile you actually want. On top of that, most power users juggle multiple browsers—I personally use Safari or Chrome for casual browsing, while relying heavily on Arc for work.

To prevent logins, cookies, and contexts from descending into chaos, the classic workaround is clunky: right-click, copy link, switch to the right browser window, and manually paste. I got sick of that tiny, persistent cognitive friction, so I built a native macOS menu bar utility: [BrowserRouter](https://github.com/KhalilHsu/browserSwitch).

![BrowserRouter General, Rules, and Advanced Preferences Panel](browser-router-showcase.png)

The underlying architecture is straightforward: it registers itself as the default HTTP/HTTPS protocol handler on macOS. Whenever any app requests to open a URL, BrowserRouter intercepts it and routes it within milliseconds based on configurable rules.

In designing the routing logic, I focused on three practical pillars:

1. **Source App & Domain Routing**: Links clicked from Slack, Feishu, or work email automatically route to your dedicated work browser. Links from Telegram, messaging apps, or RSS readers route directly to your personal reading browser.
2. **Native Profile-Level Precision**: Built-in support for Chromium profile architectures and modern browsers. It launches URLs directly into specific browser profile instances without hacky shell scripts.
3. **Instant Interactive Chooser**: For one-off staging links or tricky OAuth redirects, hold a modifier key while clicking a link, and a featherweight native popup appears right at your cursor to let you pick on the fly.

Once external links consistently land in the right browser, that subtle "pause and hesitate before clicking" dread completely evaporates.

> **Repository**: [GitHub - KhalilHsu/browserSwitch](https://github.com/KhalilHsu/browserSwitch)  
> **Official Site**: [BrowserRouter Homepage](https://khalilhsu.github.io/browserSwitch/)
