---
title: A Few Design Skills I Wrote for AI Agents
date: 2026-05-08
tags: AGENT / DESIGN / TOOLS / HTML
summary: I firmly believe 9.9 out of 10 skills on the market right now are complete garbage—including the ones I wrote here.
cover: design-skill-cover.png
---

To be blunt: every time I see someone package a few paragraphs of Markdown instructions into some "groundbreaking revolutionary Skill," it feels like extreme over-hyping.

A while back, while helping out on an agent product, I crafted several first-party design skills. Later on, I cleaned them up and open-sourced them as a repository: [Design Skills for AI Agents](https://github.com/KhalilHsu/designSkill). There is zero black magic here. Constrained by the raw capabilities of Chinese foundation models when hand-crafting frontends, pitch decks, and technical reports, I followed established community patterns and wrote three targeted design skills to rein them in.

![Design Skills for AI Agents spanning web layouts, pitch decks, and technical reports](design-skill-cover.png)

When you ask LLMs to generate raw HTML and CSS without guardrails, everyone runs into the exact same wall: either they run naked and churn out hideous, unstyled prototypes, or they parrot the same generic `Design.md` prompt templates everyone on Twitter copies. Models have never lacked syntax literacy—what they lack is an innate sense of typographic cadence and visual restraint.

So I isolated three high-frequency scenarios and established strict constraints for each:

### 1. 🎨 Web & Interfaces (`web-design-skill`)
Targeted at modern web applications and responsive landing pages. It forces the model to define a design token baseline (palettes, typographic scales, spacing grids) before touching code, and mandates that it layout realistic data rather than hallucinating absurd placeholder cards.

### 2. 📊 Presentation Decks (`presentation-deck-skill`)
Targeted at HTML/CSS-based pitch decks and slides. The core objective is blowing up walls of boring bullet points. It reorganizes information with punchy kickers, prominent hero titles, and structured visual callouts so the output looks like a thought-out presentation.

### 3. 📄 Long-form Reports & Docs (`document-report-skill`)
Targeted at PRDs, whitepapers, and technical audits. It optimizes long-text legibility—clamping line lengths within comfortable character ranges, setting generous leading and paragraph breathing room, and structuring tables and blockquotes so dense reading doesn't feel suffocating.

---

Yet after wrapping up these three skills, I’d rather just be brutally honest.

**I firmly believe that 9.9 out of 10 skills out there right now are complete garbage. In just a few months, the vast majority of these HTML skills, deck skills, and design prompts will be entirely obsolete.**

These skills are nothing more than temporary band-aids and disposable scaffolding to compensate for the deficiencies of current base models.

The only reason models currently require us to feed them hundreds of lines of Markdown begging them "don't use purple gradients," "set line-height to 1.6," and "create high contrast between headings and body" is because foundation models haven't deeply internalized human aesthetic intuition during post-training.

As multimodal alignment, RL with visual feedback, and granular preference tuning mature, foundational design and layout intuition will be baked directly into model weights. When that happens, asking an agent to "format a clean technical report" will naturally output breathable, rigorous typography without requiring external prompt crutches.

So let’s not attach grandiose value to these skills. They are temporary scaffolding for a specific technological water level. If you're building agent tools and your models are still churning out layouts ugly enough to drive you crazy, this library might buy you some time:

> **Repository**: [GitHub - KhalilHsu/designSkill](https://github.com/KhalilHsu/designSkill)

Once next-gen models internalize these basics in post-training, toss these skills straight into the trash.
