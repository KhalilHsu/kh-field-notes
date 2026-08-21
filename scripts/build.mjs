import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const contentDirectory = path.join(root, "content");
const outputDirectory = path.join(root, "dist");
const fallbackCover = "media/placeholder-cover.png";
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function paragraphize(body, imagePrefix) {
  const codeBlocks = [];
  const processedBody = body.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
    const placeholder = `<!--CODEBLOCK_${codeBlocks.length}-->`;
    codeBlocks.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  return processedBody.trim().split(/\n\s*\n/).map((paragraph) => {
    const trimmed = paragraph.trim();
    if (trimmed.startsWith("<!--CODEBLOCK_") && trimmed.endsWith("-->")) {
      const idx = parseInt(trimmed.replace("<!--CODEBLOCK_", "").replace("-->", ""), 10);
      return codeBlocks[idx];
    }
    const image = trimmed.match(/^!\[([^\]]*)\]\((media\/[^)\s]+)\)$/);
    if (image) return `<figure><img src="${imagePrefix}${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${escapeHtml(image[1])}</figcaption></figure>`;

    let html = escapeHtml(paragraph);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return `<p>${html.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

function parsePost(source, filename) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filename} needs front matter.`);
  const metadata = Object.fromEntries(match[1].trim().split("\n").map((line) => {
    const index = line.indexOf(":");
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { ...metadata, cover: metadata.cover || fallbackCover, slug: path.basename(filename, ".md"), body: match[2].trim() };
}

function shell({ title, description, content, stylesheet }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} · KH Field Notes</title>
  <script>(function(){var t=localStorage.getItem('kh-theme')||'editorial';document.documentElement.setAttribute('data-theme',t);})();</script>
  <link rel="stylesheet" href="${stylesheet}">
</head>
<body>
  ${content}

  <aside class="floating-theme-dock" id="themeDock" aria-label="主题风格切换">
    <div class="dock-handle" title="按住可随意拖拽，松开自动吸附边缘" aria-hidden="true">
      <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
        <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
        <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
        <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
      </svg>
    </div>
    <div class="theme-switcher" role="radiogroup" aria-label="主题切换">
      <button type="button" class="theme-seg-btn" data-theme-val="editorial" role="radio" aria-label="经典报刊风格">经典报刊</button>
      <button type="button" class="theme-seg-btn" data-theme-val="cards" role="radio" aria-label="现代卡片风格">现代卡片</button>
    </div>
  </aside>

  <script>
    (function() {
      // 1. Theme sync function
      function syncTheme(theme) {
        var t = theme === 'cards' ? 'cards' : 'editorial';
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('kh-theme', t); } catch(e) {}
        var buttons = document.querySelectorAll('.theme-seg-btn');
        buttons.forEach(function(btn) {
          var active = btn.getAttribute('data-theme-val') === t;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-checked', active ? 'true' : 'false');
        });
      }

      // Initialize active button state
      var initialTheme = localStorage.getItem('kh-theme') || 'editorial';
      syncTheme(initialTheme);

      // 2. Button direct click listeners (Rock-solid click handling)
      var buttons = document.querySelectorAll('.theme-seg-btn');
      buttons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          var val = this.getAttribute('data-theme-val');
          syncTheme(val);
        });
      });

      // 3. Floating Dock 4-way Draggable & Magnetic Edge-Snapping Logic
      var dock = document.getElementById('themeDock');
      if (!dock) return;

      var MARGIN = 18;
      var DRAG_THRESHOLD = 6;
      var currentX = 0;
      var currentY = 0;
      var isPointerDown = false;
      var isDragging = false;
      var startPointerX = 0, startPointerY = 0;
      var startDockX = 0, startDockY = 0;

      function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      }

      function setPosition(x, y, animate) {
        dock.style.transition = animate ? 'transform 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease' : 'none';
        dock.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
        currentX = x;
        currentY = y;
      }

      function snapTo4Edges() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width || 210;
        var dockH = rect.height || 44;
        var winW = window.innerWidth;
        var winH = window.innerHeight;

        var minX = MARGIN;
        var maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN;
        var maxY = Math.max(MARGIN, winH - dockH - MARGIN);

        // Distance from dock to 4 edges (Left, Right, Top, Bottom)
        var distLeft = Math.abs(currentX - minX);
        var distRight = Math.abs(maxX - currentX);
        var distTop = Math.abs(currentY - minY);
        var distBottom = Math.abs(maxY - currentY);

        var minDist = Math.min(distLeft, distRight, distTop, distBottom);

        var targetX = clamp(currentX, minX, maxX);
        var targetY = clamp(currentY, minY, maxY);
        var edge = 'right';

        if (minDist === distLeft) {
          targetX = minX;
          edge = 'left';
        } else if (minDist === distRight) {
          targetX = maxX;
          edge = 'right';
        } else if (minDist === distTop) {
          targetY = minY;
          edge = 'top';
        } else if (minDist === distBottom) {
          targetY = maxY;
          edge = 'bottom';
        }

        setPosition(targetX, targetY, true);

        try {
          localStorage.setItem('kh-dock-pos', JSON.stringify({
            edge: edge,
            x: targetX,
            y: targetY,
            ratioX: winW > 0 ? targetX / winW : 0.9,
            ratioY: winH > 0 ? targetY / winH : 0.1
          }));
        } catch(e) {}
      }

      function initDockPosition() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width || 210;
        var dockH = rect.height || 44;
        var winW = window.innerWidth;
        var winH = window.innerHeight;

        var minX = MARGIN;
        var maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN;
        var maxY = Math.max(MARGIN, winH - dockH - MARGIN);

        var initX = maxX;
        var initY = clamp(72, minY, maxY);

        try {
          var saved = JSON.parse(localStorage.getItem('kh-dock-pos'));
          if (saved) {
            var restoredX = typeof saved.ratioX === 'number' ? saved.ratioX * winW : saved.x;
            var restoredY = typeof saved.ratioY === 'number' ? saved.ratioY * winH : saved.y;

            if (saved.edge === 'left') restoredX = minX;
            else if (saved.edge === 'right') restoredX = maxX;
            else if (saved.edge === 'top') restoredY = minY;
            else if (saved.edge === 'bottom') restoredY = maxY;

            initX = clamp(restoredX, minX, maxX);
            initY = clamp(restoredY, minY, maxY);
          }
        } catch(e) {}

        setPosition(initX, initY, false);
      }

      // Initial position on load
      initDockPosition();

      window.addEventListener('resize', function() {
        snapTo4Edges();
      });

      dock.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        isPointerDown = true;
        isDragging = false;
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startDockX = currentX;
        startDockY = currentY;
      });

      window.addEventListener('pointermove', function(e) {
        if (!isPointerDown) return;
        var dx = e.clientX - startPointerX;
        var dy = e.clientY - startPointerY;

        if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          isDragging = true;
          dock.classList.add('is-dragging');
          dock.style.transition = 'none';
        }

        if (isDragging) {
          var rect = dock.getBoundingClientRect();
          var winW = window.innerWidth;
          var winH = window.innerHeight;

          var nextX = clamp(startDockX + dx, 0, winW - rect.width);
          var nextY = clamp(startDockY + dy, 0, winH - rect.height);

          setPosition(nextX, nextY, false);
        }
      });

      function handlePointerUp(e) {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (isDragging) {
          dock.classList.remove('is-dragging');
          snapTo4Edges();
          // Delay resetting isDragging slightly to ensure click event is ignored if it was a drag
          setTimeout(function() {
            isDragging = false;
          }, 60);
        }
      }

      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    })();
  </script>
</body>
</html>`;
}

const header = (home, archive) => `
<header class="site-header">
  <a class="site-title" href="${home}">KH Field Notes</a>
  <nav aria-label="主导航">
    <a href="${home}">文章</a>
    <a href="${archive}">归档</a>
  </nav>
</header>`;

const date = (value) => value.replaceAll("-", ".");
const postItem = (post, prefix, mediaPrefix) => `
<article class="post-item">
  <a class="list-cover" href="${prefix}${post.slug}/">
    <img src="${mediaPrefix}${escapeHtml(post.cover)}" alt="" loading="lazy">
  </a>
  <div class="post-copy">
    <p class="tag">${escapeHtml(post.tags)}</p>
    <h2><a href="${prefix}${post.slug}/">${escapeHtml(post.title)}</a></h2>
    <p class="summary">${escapeHtml(post.summary)}</p>
    <time datetime="${post.date}">${date(post.date)}</time>
  </div>
</article>`;

const archiveItem = (post, prefix) => `
<article class="archive-item">
  <time datetime="${post.date}">${date(post.date)}</time>
  <a href="${prefix}${post.slug}/">${escapeHtml(post.title)}</a>
  <span>${escapeHtml(post.tags)}</span>
</article>`;

const pageSize = 50;

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "archive"), { recursive: true });
await mkdir(path.join(outputDirectory, "post"), { recursive: true });
try { await cp(path.join(contentDirectory, "media"), path.join(outputDirectory, "media"), { recursive: true }); } catch (error) { if (error.code !== "ENOENT") throw error; }

const filenames = (await readdir(contentDirectory)).filter((name) => name.endsWith(".md"));
const posts = (await Promise.all(filenames.map(async (filename) => parsePost(await readFile(path.join(contentDirectory, filename), "utf8"), filename)))).sort((a, b) => b.date.localeCompare(a.date));

const latestPosts = posts.slice(0, 12);
const introduction = `
<main class="page">
  <p class="eyebrow">PERSONAL NOTES</p>
  <h1>KH Field Notes</h1>
  <p class="intro">一些做过的事、注意到的东西，和还没想清楚的问题。</p>
  <section class="post-list" aria-label="最新文章">${latestPosts.map((post) => postItem(post, "post/", "")).join("\n")}</section>
  ${posts.length > latestPosts.length ? `<p class="archive-link"><a href="archive/">查看全部 ${posts.length} 篇文章 →</a></p>` : ""}
</main>`;

await writeFile(path.join(outputDirectory, "index.html"), shell({ title: "KH Field Notes", description: "一些做过的事、注意到的东西，和还没想清楚的问题。", content: `${header("./", "archive/")}${introduction}`, stylesheet: "styles.css" }));

for (let page = 1; page <= Math.ceil(posts.length / pageSize); page += 1) {
  const slice = posts.slice((page - 1) * pageSize, page * pageSize);
  const previous = page > 1 ? `<a href="../">← 较新的文章</a>` : "";
  const next = page < Math.ceil(posts.length / pageSize) ? `<a href="${page === 1 ? "page/2/" : `../${page + 1}/`}">较早的文章 →</a>` : "";
  const pagination = previous || next ? `<p class="archive-link">${previous}${previous && next ? "　" : ""}${next}</p>` : "";
  const archive = `
<main class="page">
  <p class="eyebrow">ALL POSTS · ${posts.length}</p>
  <h1>归档</h1>
  <section class="archive-list">${slice.map((post) => archiveItem(post, "../post/")).join("\n")}</section>
  ${pagination}
</main>`;
  const directory = page === 1 ? path.join(outputDirectory, "archive") : path.join(outputDirectory, "archive", "page", String(page));
  await mkdir(directory, { recursive: true });
  const depth = page === 1 ? "../" : "../../../";
  await writeFile(path.join(directory, "index.html"), shell({ title: "归档", description: "KH Field Notes 的所有文章。", content: `${header(depth, "./")}${archive}`, stylesheet: `${depth}styles.css` }));
}

for (const post of posts) {
  const directory = path.join(outputDirectory, "post", post.slug);
  await mkdir(directory, { recursive: true });
  const article = `
<main class="article">
  <p class="tag">${escapeHtml(post.tags)}</p>
  <time datetime="${post.date}">${date(post.date)}</time>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="lead">${escapeHtml(post.summary)}</p>
  <div class="article-body">${paragraphize(post.body, "../../")}</div>
  <a class="back" href="../../">← 返回文章列表</a>
</main>`;
  await writeFile(path.join(directory, "index.html"), shell({ title: post.title, description: post.summary, content: `${header("../../", "../../archive/")}${article}`, stylesheet: "../../styles.css" }));
}

const css = `
/* ==========================================================================
   Base & Reset
   ========================================================================== */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  transition: background-color 0.25s ease;
}

body {
  margin: 0;
  min-height: 100vh;
  line-height: 1.7;
}

img {
  max-width: 100%;
  display: block;
}

/* ==========================================================================
   Shared Header
   ========================================================================== */
.site-header {
  max-width: 1140px;
  margin: 0 auto;
  padding: 32px 28px 24px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
}

.site-title {
  font-weight: 600;
  font-size: 18px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: inherit;
  text-decoration: none;
}

.site-header nav {
  display: flex;
  gap: 20px;
  font: 14px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.site-header nav a {
  color: inherit;
  opacity: 0.75;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.site-header nav a:hover {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ==========================================================================
   Floating Draggable & 4-Way Magnetic Edge-Snapping Theme Dock
   ========================================================================== */
.floating-theme-dock {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px 5px 10px;
  border-radius: 9999px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  cursor: grab;
  will-change: transform;
}

.floating-theme-dock.is-dragging {
  cursor: grabbing;
  transform: scale(1.03);
}

.dock-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.35;
  color: currentColor;
  cursor: grab;
  padding: 4px 2px;
  transition: opacity 0.15s ease;
}

.floating-theme-dock:hover .dock-handle {
  opacity: 0.7;
}

.floating-theme-dock.is-dragging .dock-handle {
  cursor: grabbing;
}

.floating-theme-dock .theme-switcher {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 9999px;
  gap: 2px;
}

.floating-theme-dock .theme-seg-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  font: 500 12.5px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: inherit;
  opacity: 0.65;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.floating-theme-dock .theme-seg-btn:hover {
  opacity: 1;
}

.floating-theme-dock .theme-seg-btn.active {
  opacity: 1;
  font-weight: 600;
  background: #ffffff;
  color: #161513;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Dock styling in Editorial Theme */
html[data-theme="editorial"] .floating-theme-dock {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
  color: #20201e;
}

html[data-theme="editorial"] .floating-theme-dock .theme-switcher {
  background: rgba(0, 0, 0, 0.05);
}

html[data-theme="editorial"] .floating-theme-dock.is-dragging {
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Dock styling in Cards Theme */
html[data-theme="cards"] .floating-theme-dock {
  background: rgba(255, 251, 245, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(22, 21, 19, 0.12);
  box-shadow: 0 12px 36px rgba(42, 32, 19, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04);
  color: #161513;
}

html[data-theme="cards"] .floating-theme-dock .theme-switcher {
  background: rgba(22, 21, 19, 0.07);
}

html[data-theme="cards"] .floating-theme-dock.is-dragging {
  box-shadow: 0 22px 56px rgba(42, 32, 19, 0.22), 0 4px 14px rgba(0, 0, 0, 0.08);
}

/* ==========================================================================
   Theme 1: Editorial (经典报刊 · 默认)
   ========================================================================== */
html[data-theme="editorial"] {
  --paper: #fffefd;
  --ink: #20201e;
  --muted: #74736e;
  --rule: #deddd8;
  background: var(--paper);
}

html[data-theme="editorial"] body {
  color: var(--ink);
  font-family: ui-serif, Georgia, "Songti SC", "Noto Serif SC", serif;
}

html[data-theme="editorial"] .site-header {
  max-width: 1080px;
  padding: 32px 28px 24px;
  border-bottom: 1px solid var(--rule);
}

html[data-theme="editorial"] .site-title {
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
}

html[data-theme="editorial"] .page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 72px 28px 96px;
}

html[data-theme="editorial"] .eyebrow,
html[data-theme="editorial"] .tag,
html[data-theme="editorial"] time {
  font: 11px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}

html[data-theme="editorial"] .page h1 {
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 1.15;
  margin: 12px 0 16px;
  font-size: clamp(40px, 7vw, 68px);
}

html[data-theme="editorial"] .intro {
  max-width: 38em;
  margin: 0;
  color: #4a4945;
  font-size: 20px;
}

html[data-theme="editorial"] .post-list {
  margin-top: 62px;
  border-top: 1px solid var(--rule);
}

html[data-theme="editorial"] .post-item {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 36px;
  min-height: 220px;
  padding: 28px 0 32px;
  border-bottom: 1px solid var(--rule);
}

html[data-theme="editorial"] .list-cover {
  display: block;
  align-self: stretch;
  background: #eeece7;
  overflow: hidden;
  border-radius: 2px;
}

html[data-theme="editorial"] .list-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

html[data-theme="editorial"] .post-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

html[data-theme="editorial"] .post-item .tag {
  margin: 0 0 8px;
}

html[data-theme="editorial"] .post-item h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

html[data-theme="editorial"] .post-item h2 a {
  color: inherit;
  text-decoration: none;
}

html[data-theme="editorial"] .post-item h2 a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="editorial"] .summary {
  margin: 8px 0 0;
  color: #66645f;
  font-size: 15px;
  line-height: 1.6;
}

html[data-theme="editorial"] .post-copy time {
  margin-top: auto;
  padding-top: 18px;
}

html[data-theme="editorial"] .archive-list {
  margin-top: 54px;
  border-top: 1px solid var(--rule);
}

html[data-theme="editorial"] .archive-item {
  display: grid;
  grid-template-columns: 110px 1fr 160px;
  gap: 24px;
  padding: 15px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 16px;
}

html[data-theme="editorial"] .archive-item a {
  color: inherit;
  text-decoration: none;
}

html[data-theme="editorial"] .archive-item a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="editorial"] .archive-item span {
  font: 11px/1.4 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.06em;
  color: var(--muted);
}

html[data-theme="editorial"] .archive-link {
  margin-top: 28px;
  font: 13px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
}

html[data-theme="editorial"] .archive-link a {
  color: var(--muted);
  text-decoration: none;
}

html[data-theme="editorial"] .archive-link a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="editorial"] .article {
  max-width: 1080px;
  margin: 0 auto;
  padding: 72px 28px 96px;
}

html[data-theme="editorial"] .article > .tag {
  margin: 0 0 14px;
}

html[data-theme="editorial"] .article > time {
  display: block;
  margin-bottom: 20px;
}

html[data-theme="editorial"] .article h1 {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1.25;
  margin: 14px 0 20px;
  max-width: 100%;
}

html[data-theme="editorial"] .lead {
  margin: 0 0 48px;
  font-size: 21px;
  line-height: 1.65;
  color: #4a4945;
  max-width: 920px;
}

html[data-theme="editorial"] .article-body {
  max-width: 900px;
  font-size: 19px;
  line-height: 1.8;
}

html[data-theme="editorial"] .article-body p {
  margin: 0 0 1.6em;
}

html[data-theme="editorial"] .article-body figure {
  margin: 2.5em 0;
}

html[data-theme="editorial"] .article-body img {
  border-radius: 2px;
}

html[data-theme="editorial"] .article-body figcaption {
  margin-top: 10px;
  color: var(--muted);
  font: 13px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
}

html[data-theme="editorial"] .article-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.86em;
  background: #f3f2ee;
  padding: 3px 7px;
  border-radius: 4px;
  color: #1e1e1e;
}

html[data-theme="editorial"] .article-body pre {
  background: #f8f7f4;
  padding: 18px 22px;
  border-radius: 6px;
  overflow-x: auto;
  border: 1px solid var(--rule);
  margin: 1.8em 0;
}

html[data-theme="editorial"] .article-body pre code {
  background: none;
  padding: 0;
  font-size: 14px;
  line-height: 1.65;
  color: #2c2c2a;
}

html[data-theme="editorial"] .article-body a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="editorial"] .article-body a:hover {
  color: var(--muted);
}

html[data-theme="editorial"] .back {
  display: inline-block;
  margin-top: 48px;
  font: 14px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  color: var(--muted);
  text-decoration: none;
}

html[data-theme="editorial"] .back:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ==========================================================================
   Theme 2: Cards (现代卡片 · 还原第一版设计语言)
   ========================================================================== */
html[data-theme="cards"] {
  --color-canvas: #f6f3eb;
  --color-ink: #161513;
  --color-muted: #6f685e;
  --color-border: rgba(22, 21, 19, 0.09);
  --color-card-bg: rgba(255, 255, 255, 0.82);
  --color-card-border: rgba(22, 21, 19, 0.08);
  --color-shadow: 0 14px 36px rgba(31, 41, 55, 0.06);
  --color-shadow-hover: 0 22px 50px rgba(42, 32, 19, 0.12);
  background: var(--color-canvas);
}

html[data-theme="cards"] body {
  color: var(--color-ink);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 12% 10%, rgba(224, 199, 150, 0.38), transparent 36%),
    radial-gradient(circle at 88% 18%, rgba(168, 193, 183, 0.42), transparent 32%),
    linear-gradient(180deg, #f7f3ea 0%, #f1ece4 45%, #e9e3d6 100%);
  background-attachment: fixed;
}

html[data-theme="cards"] .site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 251, 245, 0.8);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--color-border);
  padding: 20px 28px;
}

html[data-theme="cards"] .site-title {
  font-weight: 700;
  letter-spacing: -0.03em;
  font-size: 19px;
}

html[data-theme="cards"] .page {
  max-width: 1140px;
  margin: 0 auto;
  padding: 56px 28px 88px;
}

html[data-theme="cards"] .eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(22, 21, 19, 0.06);
  border: 1px solid rgba(22, 21, 19, 0.08);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 16px;
}

html[data-theme="cards"] .page h1 {
  font-size: clamp(38px, 6vw, 62px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.15;
  margin: 0 0 16px;
}

html[data-theme="cards"] .intro {
  max-width: 42em;
  margin: 0;
  font-size: 19px;
  line-height: 1.6;
  color: var(--color-muted);
}

/* Multi-column responsive card grid */
html[data-theme="cards"] .post-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 28px;
  margin-top: 52px;
  border-top: none;
}

html[data-theme="cards"] .post-item {
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-card-border);
  border-radius: 22px;
  padding: 16px;
  box-shadow: var(--color-shadow);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
  min-height: 0;
}

html[data-theme="cards"] .post-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--color-shadow-hover);
  border-color: rgba(22, 21, 19, 0.18);
}

html[data-theme="cards"] .list-cover {
  aspect-ratio: 16 / 10;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #e4ded5, #cfc8be);
  margin-bottom: 16px;
}

html[data-theme="cards"] .list-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

html[data-theme="cards"] .post-item:hover .list-cover img {
  transform: scale(1.03);
}

html[data-theme="cards"] .post-copy {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 4px 6px 6px;
}

html[data-theme="cards"] .post-item .tag {
  display: inline-block;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(22, 21, 19, 0.05);
  border: 1px solid rgba(22, 21, 19, 0.06);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0 0 10px;
}

html[data-theme="cards"] .post-item h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}

html[data-theme="cards"] .post-item h2 a {
  color: inherit;
  text-decoration: none;
}

html[data-theme="cards"] .post-item h2 a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="cards"] .summary {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-muted);
  margin: 0 0 18px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

html[data-theme="cards"] .post-copy time {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid rgba(22, 21, 19, 0.06);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #8c857b;
}

/* Archive page cards */
html[data-theme="cards"] .archive-list {
  display: grid;
  gap: 12px;
  margin-top: 40px;
  border-top: none;
}

html[data-theme="cards"] .archive-item {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 16px 22px;
  background: var(--color-card-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--color-card-border);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  font-size: 15px;
}

html[data-theme="cards"] .archive-item:hover {
  background: #ffffff;
  transform: translateX(4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  border-color: rgba(22, 21, 19, 0.16);
}

html[data-theme="cards"] .archive-item a {
  color: inherit;
  font-weight: 500;
  text-decoration: none;
}

html[data-theme="cards"] .archive-item a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="cards"] .archive-item time {
  font-size: 12px;
  color: var(--color-muted);
}

html[data-theme="cards"] .archive-item span {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(22, 21, 19, 0.05);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-muted);
}

html[data-theme="cards"] .archive-link {
  margin-top: 36px;
  font-size: 14px;
  font-weight: 500;
}

html[data-theme="cards"] .archive-link a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  color: var(--color-ink);
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

html[data-theme="cards"] .archive-link a:hover {
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

/* Article detail card container */
html[data-theme="cards"] .article {
  max-width: 900px;
  margin: 44px auto 96px;
  padding: 56px 56px 72px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-card-border);
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(31, 41, 55, 0.06);
}

html[data-theme="cards"] .article > .tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(22, 21, 19, 0.06);
  border: 1px solid rgba(22, 21, 19, 0.08);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin: 0 0 16px;
}

html[data-theme="cards"] .article > time {
  display: block;
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: 18px;
}

html[data-theme="cards"] .article h1 {
  font-size: clamp(34px, 5vw, 48px);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.25;
  margin: 0 0 18px;
}

html[data-theme="cards"] .lead {
  font-size: 19px;
  line-height: 1.65;
  color: #4b463e;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(22, 21, 19, 0.08);
  margin: 0 0 36px;
}

html[data-theme="cards"] .article-body {
  font-size: 17.5px;
  line-height: 1.85;
  color: #24221f;
}

html[data-theme="cards"] .article-body p {
  margin: 0 0 1.6em;
}

html[data-theme="cards"] .article-body figure {
  margin: 2.5em 0;
}

html[data-theme="cards"] .article-body img {
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

html[data-theme="cards"] .article-body figcaption {
  margin-top: 12px;
  color: var(--color-muted);
  font-size: 13px;
  text-align: center;
}

html[data-theme="cards"] .article-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  background: #eeeae0;
  padding: 3px 8px;
  border-radius: 6px;
  color: #1e1e1e;
}

html[data-theme="cards"] .article-body pre {
  background: #f4f0e6;
  padding: 20px 24px;
  border-radius: 14px;
  overflow-x: auto;
  border: 1px solid rgba(22, 21, 19, 0.08);
  margin: 2em 0;
}

html[data-theme="cards"] .article-body pre code {
  background: none;
  padding: 0;
  font-size: 14px;
  line-height: 1.65;
  color: #2c2c2a;
}

html[data-theme="cards"] .article-body a {
  color: #161513;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
}

html[data-theme="cards"] .back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 48px;
  padding: 9px 20px;
  border-radius: 999px;
  background: rgba(22, 21, 19, 0.05);
  border: 1px solid rgba(22, 21, 19, 0.08);
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

html[data-theme="cards"] .back:hover {
  background: #161513;
  color: #ffffff;
  border-color: #161513;
}

/* ==========================================================================
   Responsive Adaptations
   ========================================================================== */
@media (max-width: 768px) {
  .site-header {
    padding: 22px 20px;
  }
  .page,
  html[data-theme="editorial"] .page,
  html[data-theme="cards"] .page {
    padding: 36px 20px 60px;
  }
  html[data-theme="editorial"] .post-item,
  html[data-theme="editorial"] .archive-item {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  html[data-theme="editorial"] .list-cover {
    aspect-ratio: 16 / 9;
  }
  html[data-theme="editorial"] .archive-item span {
    display: none;
  }
  html[data-theme="cards"] .post-list {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  html[data-theme="cards"] .archive-item {
    grid-template-columns: 90px 1fr;
    gap: 12px;
  }
  html[data-theme="cards"] .archive-item span {
    display: none;
  }
  html[data-theme="cards"] .article {
    margin: 20px 16px 60px;
    padding: 32px 22px 48px;
    border-radius: 20px;
  }
  html[data-theme="editorial"] .article {
    padding: 36px 20px 60px;
  }
}
`;

await writeFile(path.join(outputDirectory, "styles.css"), css.trim());
console.log(`Built ${posts.length} posts in dist/ with 4-way magnetic snapping dock.`);
