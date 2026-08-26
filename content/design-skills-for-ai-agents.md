---
title: 给 AI Agent 装上一套专业设计能力
date: 2026-05-08
tags: AGENT / DESIGN / TOOLS / HTML
summary: 让 Agent 告别千篇一律的粗糙模板，在网页、幻灯片与长篇报告中建立真正专业的设计审美与排版纪律。
cover: media/design-skill-cover.png
---

让大模型直接写 HTML/CSS 或生成界面时，大多数人都会遇到类似的问题：它几乎总是倾向于生成千篇一律的通用 SaaS 模板——满屏的紫色渐变、毫无呼吸感的卡片堆叠、居中对齐的空洞 Slogan，以及毫无字阶节奏的无序文本。

大模型本身并不缺乏编写 HTML/CSS 语法的能力，它欠缺的是**专业设计师在动手前那一整套内化的决策直觉与排版纪律**。

为了让 Agent 在生成前端界面、演示文稿和长篇文档时具备真正的设计审美，我整理并开源了这套设计技能库：[Design Skills for AI Agents](https://github.com/KhalilHsu/designSkill)。

![Design Skills for AI Agents 涵盖网页、演示文稿与长篇文档三大维度](media/design-skill-cover.png)

这套技能库采用渐进式披露（Progressive Disclosure）的架构设计，将设计师的知识解构为清晰的指令集（`SKILL.md`）与模块化参考知识库（`references/`）。它主要包含三个核心场景技能：

### 1. 🎨 网页与界面设计（`web-design-skill`）
面向可浏览、可交互的 Modern Web 页面与 Web App 界面。
- **强制设计工序**：在生成代码前，强制 Agent 经历“确立视觉风格（如瑞士现代主义、Neo-Modern 等）→ 定义 Design Tokens（色彩、字阶、间距网格）→ 布局与层级规划 → 组件与交互打磨”的标准流程。
- **杜绝数据胡编**：严格尊重业务上下文中的真实字段与数据形态，拒绝用千篇一律的占位卡片破坏实际的业务逻辑。

### 2. 📊 演示文稿生成（`presentation-deck-skill`）
面向基于 HTML/CSS 的高质量演示文稿与 Pitch Deck。
- **视觉叙事结构**：把幻灯片当作“视觉故事”来构思，而不是枯燥的 Bullet Points 罗列。
- **严格的字阶秩序**：通过眉标（Kicker）、主标题（Title）与正文（Body）的鲜明张力，配合图表与数据信息图，打造节奏舒适的演示体验。

### 3. 📄 长篇文档与评估报告（`document-report-skill`）
面向 PRD、技术白皮书、咨询备忘录与长篇评估报告。
- **排版可读性优先**：针对长文本阅读优化每行字符数（Line Length）、行高（Line Height）与段落留白。
- **数据图表与方法论结构**：规范化表格、引用来源与图表排版，使生成的文档具备出色的出版级质感。

---

让 Agent 做出好设计，靠的不是在 Prompt 里堆砌“请设计得高端大气”这类空洞形容词，而是**为它提供一套清晰的视觉规则、设计系统与质量准则**。

> **项目地址**：[GitHub - KhalilHsu/designSkill](https://github.com/KhalilHsu/designSkill)
