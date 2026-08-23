---
title: 我为 DeepSeek Harness 写了两个插件
date: 2026-08-21
tags: AI / AGENT / TOOLS
summary: 在 1M 上下文与多轮 Loop 之间，补齐现代 Agent 交互体验的几块拼图。
---

DeepSeek Harness 开源之后，我第一时间搭起来体验了一下。为了看看原生模型在真实任务中的表现，我直接接入了 DeepSeek V4 / V4 Pro 的 API。

实际用了一阵子后，我觉得整体体验相当不错。但作为一款刚开源的 Harness，它在 Web GUI 的一些现代 Agent 通用交互细节上，还留着不少粗糙的毛坯感。

为了让自己用得更顺手，我利用 DSH 原生的 Profile-Plugin 机制，写了两个 UI 插件。

第一个痛点出在 Agent Loop 的信息展示上。

当模型在执行复杂任务时，通常会经历多轮推理与 Tool Call。在默认界面里，所有的思考过程（CoT）、中间工具调用和长长的输出日志被一股脑全部铺开在聊天流中。这种瀑布式的信息轰炸让页面的可读性降到了极点——很多时候作为使用者，我最先关注的只是最终轮次里 Assistant 交付的有效结论。

于是我做了第一个插件：`@khalilhsu/dsh-ui-conversation-folded`。它会将每一轮的中间活动（思考过程、工具调用与过渡碎碎念）整齐折叠收纳在一个 288px 高度的可滚动视窗内，而最终结论文本与轮次指标则保留在外面清晰可见。它还支持流式输出时的自动跟随滚动与全局展开/收起切换，平时保持整个交互流干净、聚焦。

第二个痛点来自长上下文的浏览。

因为原生支持 1M 的长上下文，在实际协作中很容易不知不觉聊上许多轮（写一个插件前前后后大概会经历 18 到 20 轮密集交互）。当对话拉得极长时，想要回看最初几轮提的某个要求或者前面的某个关键片段，反复上下拖动滚动条非常折磨。

第二个插件是 `@khalilhsu/dsh-ui-query-navigator`，一个类似 Codex 风格的左轨多轮导航器。它会自动提取每一轮用户发送的 Query 作为时间轴锚点，在屏幕左侧固定显示。滚动页面时会自动高亮当前所在轮次，悬停可以预览提问，点击即可一键平滑跳转。

这两个插件做完之后，整个工作流顺手了许多。

![DeepSeek Harness UI 插件实际交互效果演示](media/dsh-plugins-demo.mp4)

总体来说，DeepSeek Harness 是一个让我挺满意的项目。它的 UI 谈不上极尽精美，但很精致，能看出经过了专门的交互考量。我尤其喜欢它的 Trace 轨迹设计——尽管整体偏 Developer-oriented，但它直观地拆解了 Agent Harness 底层的调度逻辑，能让很多人清晰看懂智能体到底是如何思考和行动的。

整个插件的开发和调试过程，大概只花掉了 10 块钱出头的 API 费用。

插件代码已经开源在 GitHub，并且发布到了 npm。如果你也在用 DeepSeek Harness 的 Web GUI，可以通过官方的插件机制直接安装：

```sh
# 1. 单轮中间过程折叠
dsh plugin --profile web add @khalilhsu/dsh-ui-conversation-folded

# 2. 左轨 Query 导航器
dsh plugin --profile web add @khalilhsu/dsh-ui-query-navigator
```

也可以直接查看仓库源码：[KhalilHsu/dsh-plugins](https://github.com/KhalilHsu/dsh-plugins)。
