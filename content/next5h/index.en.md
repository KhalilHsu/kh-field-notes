---
title: We've Suffered the 5-Hour Limit Long Enough
date: 2026-09-02
tags: MACOS / AI / CODEX / TOOLS
summary: While everyone was complaining on Twitter, my instinct was to build a tool to optimize the rolling window.
cover: next5h-cover.jpg
---

ChatGPT Plus introduced the strict 5-hour rolling usage limit.

Just when you're in the zone making critical edits, that dreaded red banner pops up: `You've reached your usage limit until...`. Feeds were flooded with heated debates about rate limits. But looking at the mechanics of this rule, my instinct immediately kicked in: **let's optimize around it**.

---

I dug into how this 5-hour window actually behaves.

Under the hood, it's a **rolling window**, not a fixed-schedule reset. If you don't send any message during those 5 hours, the timer doesn't start, and your next reset gets pushed back indefinitely.

Once that rule was clear, what I really needed came down to two practical workflows:

### 1. Auto-dispatching queued tasks the moment quotas unlock at midnight

Often you exhaust your quota late at night, and the next unlock happens around 2:00 AM or 3:00 AM. Staying awake just to trigger a prompt is miserable, but simply sleeping through it wastes precious computational bandwidth.

I needed a utility where I could stage my prompts before bed, select the designated Project and Session, and let it dispatch automatically as soon as the quota resets—so results are waiting when I wake up.

### 2. Early morning primer to maximize usable daytime windows

If there are no overnight tasks and you wake up naturally at 9:00 AM to send your first message, the 5-hour countdown only starts then. You end up squeezing in at most two quota cycles before the day ends.

However, if an automated trigger fires a lightweight query at 6:00 AM or 7:00 AM to kick off the window early, by the time you actually start working, the first cycle is already well underway or nearing its next refresh. That comfortably secures 3 full usage windows throughout the day, maximizing the subscription's efficiency.

---

With these two problems defined, I built a lightweight native macOS desktop utility: [Next5h](https://github.com/KhalilHsu/next5h).

![Next5h - macOS Native Codex 5H Continuity Tool](next5h-cover.jpg)

The implementation is straightforward and revolves around three pieces:

1. **Local Usage Metrics**: Reading local Codex usage states to monitor remaining allowance and the exact reset timestamp.
2. **Project & Session Routing**: Parsing local workspace context so queries land precisely in the right project and active thread.
3. **Scheduled Dispatcher**: Interacting with local model response channels to dispatch prompts punctually when the window resets.

Closing these timing gaps means computational capacity isn't wasted overnight, and an extra full cycle is gained during the day.

> **Repository**: [GitHub - KhalilHsu/next5h](https://github.com/KhalilHsu/next5h)  
> **Official Site**: [Next5h Homepage](https://khalilhsu.github.io/next5h/)
