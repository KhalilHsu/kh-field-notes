---
title: 给本地 Agent 倒一杯卡布奇诺
date: 2026-08-06
tags: MACOS / AGENT / TOOLS / SWIFT
summary: 防休眠与状态保持，给跑任务的本地 Agent 倒上一杯清醒的咖啡。
cover: media/coffee-or-tea-cover.png
---

有一次我让 Codex Agent 帮我处理一件需要用到 Computer Use 的任务，随后我就离开桌面去打球了。过了两个小时打完球回来，打开电脑，发现它因为系统自动锁定一直卡在最开始的地方，一点都没干，让人非常不爽。

解决防休眠的传统手段很多，最原生的是终端里的 `caffeinate`，但容易忘关，合盖放进背包几个小时后掏出来电脑滚烫、电量掉光；市面上的防休眠菜单栏工具也不少，但往往夹杂着复杂的配置、臃肿的 Web 包装，甚至还有网络上报。

为了给本地 Agent 一个最轻快、最让人放心的运行环境，我写了这个原生的 macOS 菜单栏小工具：[KeepAwake（CoffeeORTea）](https://khalilhsu.github.io/CoffeeORTea/)。

![KeepAwake 原生菜单栏与防休眠控制面板](media/coffee-or-tea-cover.png)

它的核心逻辑非常纯粹：像给 Mac 倒了一杯咖啡一样，一键让系统保持清醒；不需要时，轻轻一拨恢复正常的系统节律。

里面我还加了一个“假装关机、偷偷努力”（Blackout）。晚上挂任务时把屏幕一直亮着太刺眼，但如果真的关闭显示器，系统又会销毁渲染管线导致视觉 Agent 直接“瞎掉”。Blackout 模式只是把屏幕亮度完全压黑，表面上看电脑像关了屏在休息，但后台的画面和窗口依然在正常渲染，让本地 Agent 可以在一片漆黑中继续流畅地截图、识别和操作。

为了保持体验的克制与干净，整个项目完全使用 Swift 与 AppKit 原生编写：

* 零第三方运行时依赖，不引入任何重型框架，纯 Universal Binary（Apple Silicon + Intel）构建。

* 零网络请求，无任何遥测或数据收集，完全在本地安静运行。

给桌上的 Agent 倒上一杯咖啡，然后安心合眼或者出门走走。那些耗时耗力的繁重任务，就交给它在后台安静搞定吧。

> **项目地址**：[GitHub - KhalilHsu/CoffeeORTea](https://github.com/KhalilHsu/CoffeeORTea)
> **产品官网**：[KeepAwake 官方主页](https://khalilhsu.github.io/CoffeeORTea/)
