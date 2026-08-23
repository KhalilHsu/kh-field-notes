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

function shell({ title, description, content, stylesheet, assetPrefix = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} · KH Field Notes</title>
  <link rel="icon" href="${assetPrefix}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${assetPrefix}favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="${assetPrefix}apple-touch-icon.png">
  <script>(function(){var t=localStorage.getItem('kh-theme')||'editorial';if(t==='cards')t='magazine';document.documentElement.setAttribute('data-theme',t);})();</script>
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
      <button type="button" class="theme-seg-btn" data-theme-val="magazine" role="radio" aria-label="画报潮流风格">画报潮流</button>
    </div>
  </aside>

  <script>
    (function() {
      // 1. Theme sync function
      function syncTheme(theme) {
        var t = (theme === 'magazine' || theme === 'cards') ? 'magazine' : 'editorial';
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('kh-theme', t); } catch(e) {}

        var buttons = document.querySelectorAll('.theme-seg-btn');
        buttons.forEach(function(btn) {
          var val = btn.getAttribute('data-theme-val');
          var active = (val === t) || (val === 'magazine' && t === 'cards');
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-checked', active ? 'true' : 'false');
        });
      }

      var savedTheme = localStorage.getItem('kh-theme') || 'editorial';
      syncTheme(savedTheme);

      // 2. Direct click handler for theme switcher buttons with stopPropagation
      var themeButtons = document.querySelectorAll('.theme-seg-btn');
      themeButtons.forEach(function(btn) {
        btn.addEventListener('pointerdown', function(e) {
          e.stopPropagation();
        });
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var val = this.getAttribute('data-theme-val');
          syncTheme(val);
        });
      });

      var dock = document.getElementById('themeDock');
      if (!dock) return;

      var switcher = dock.querySelector('.theme-switcher');
      if (switcher) {
        // Open trigger: only when hovering the switcher itself
        switcher.addEventListener('mouseenter', function() {
          if (!isDragging) {
            dock.classList.add('is-expanded');
          }
        });
      }

      // Close trigger: only when leaving the ENTIRE dock area (switcher + drag handle)
      dock.addEventListener('mouseleave', function() {
        if (!isDragging) {
          dock.classList.remove('is-expanded');
        }
      });

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

      function applyPlacement(edge, x, y, animate) {
        dock.setAttribute('data-dock-edge', edge);
        dock.style.transition = animate ? 'top 0.3s cubic-bezier(0.2, 0, 0, 1), left 0.3s cubic-bezier(0.2, 0, 0, 1), right 0.3s cubic-bezier(0.2, 0, 0, 1), bottom 0.3s cubic-bezier(0.2, 0, 0, 1)' : 'none';

        if (edge === 'right') {
          dock.style.left = 'auto';
          dock.style.right = MARGIN + 'px';
          dock.style.top = y + 'px';
          dock.style.bottom = 'auto';
          dock.style.transform = 'none';
        } else if (edge === 'left') {
          dock.style.left = MARGIN + 'px';
          dock.style.right = 'auto';
          dock.style.top = y + 'px';
          dock.style.bottom = 'auto';
          dock.style.transform = 'none';
        } else if (edge === 'top') {
          dock.style.left = x + 'px';
          dock.style.right = 'auto';
          dock.style.top = MARGIN + 'px';
          dock.style.bottom = 'auto';
          dock.style.transform = 'none';
        } else if (edge === 'bottom') {
          dock.style.left = x + 'px';
          dock.style.right = 'auto';
          dock.style.top = 'auto';
          dock.style.bottom = MARGIN + 'px';
          dock.style.transform = 'none';
        } else {
          dock.style.left = x + 'px';
          dock.style.top = y + 'px';
          dock.style.right = 'auto';
          dock.style.bottom = 'auto';
          dock.style.transform = 'none';
        }

        currentX = x;
        currentY = y;
      }

      function snapTo4Edges() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width;
        var dockH = rect.height;
        var winW = window.innerWidth;
        var winH = window.innerHeight;

        var minX = MARGIN;
        var maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN;
        var maxY = Math.max(MARGIN, winH - dockH - MARGIN);

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

        applyPlacement(edge, targetX, targetY, true);

        try {
          localStorage.setItem('kh-dock-pos', JSON.stringify({
            edge: edge,
            x: targetX,
            y: targetY,
            ratioX: winW > 0 ? targetX / winW : 0.9,
            ratioY: winH > 0 ? targetY / winH : 0.05
          }));
        } catch(e) {}
      }

      function initDockPosition() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width || 120;
        var dockH = rect.height || 36;
        var winW = window.innerWidth;
        var winH = window.innerHeight;

        var minX = MARGIN;
        var maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN;
        var maxY = Math.max(MARGIN, winH - dockH - MARGIN);

        // Default top-right position (24px from top, 18px from right edge)
        var initEdge = 'right';
        var initX = maxX;
        var initY = clamp(24, minY, maxY);

        try {
          var saved = JSON.parse(localStorage.getItem('kh-dock-pos'));
          if (saved && saved.edge) {
            initEdge = saved.edge;
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

        applyPlacement(initEdge, initX, initY, false);
      }

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

        var rect = dock.getBoundingClientRect();
        startDockX = rect.left;
        startDockY = rect.top;
        currentX = rect.left;
        currentY = rect.top;
      });

      window.addEventListener('pointermove', function(e) {
        if (!isPointerDown) return;
        var dx = e.clientX - startPointerX;
        var dy = e.clientY - startPointerY;

        if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          isDragging = true;
          dock.classList.add('is-dragging');
          dock.classList.remove('is-expanded');
          dock.style.transition = 'none';
        }

        if (isDragging) {
          var rect = dock.getBoundingClientRect();
          var winW = window.innerWidth;
          var winH = window.innerHeight;

          var nextX = clamp(startDockX + dx, 0, winW - rect.width);
          var nextY = clamp(startDockY + dy, 0, winH - rect.height);

          dock.style.left = nextX + 'px';
          dock.style.top = nextY + 'px';
          dock.style.right = 'auto';
          dock.style.bottom = 'auto';
          dock.style.transform = 'none';

          currentX = nextX;
          currentY = nextY;
        }
      });

      function handlePointerUp(e) {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (isDragging) {
          dock.classList.remove('is-dragging');
          dock.classList.remove('is-expanded');
          snapTo4Edges();
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

const formatDateDot = (value) => value.replaceAll("-", ".");
const formatDateShort = (value) => {
  try {
    const [year, month, day] = value.split("-");
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${monthName} ${day}`;
  } catch (e) {
    return value;
  }
};

const renderTagBadges = (tagsStr) => {
  const tags = tagsStr.split("/").map((t) => t.trim()).filter(Boolean);
  return tags.map((t) => `<span class="tag-badge">${escapeHtml(t)}</span>`).join("");
};

const header = (home, archive, activePage = "home") => `
<header class="site-header">
  <div class="site-header-editorial-bar">
    <a class="site-title" href="${home}">KH Field Notes</a>
    <nav class="nav-editorial" aria-label="主导航">
      <a href="${home}" class="${activePage === "home" ? "is-active" : ""}">文章</a>
      <a href="${archive}" class="${activePage === "archive" ? "is-active" : ""}">归档</a>
    </nav>
  </div>

  <div class="site-header-mag-masthead">
    <div class="mag-masthead-main">
      <a class="mag-logo" href="${home}">KH FIELD NOTES</a>
      <div class="mag-slogan">
        <span>NAVIGATING AI, TOOLS,</span>
        <span>INTERFACES & CREATIVE</span>
        <span>FIELD EXPERIMENTS</span>
      </div>
    </div>

    <div class="mag-bar-primary">
      <div class="mag-bar-left">
        <a href="${home}" class="mag-crumb ${activePage === "home" ? "is-current" : ""}">HOME</a>
      </div>
      <nav class="mag-nav-links" aria-label="画报导航">
        <a href="${home}" class="${activePage === "home" ? "is-current" : ""}">STORIES</a>
        <a href="${archive}" class="${activePage === "archive" ? "is-current" : ""}">ARCHIVE</a>
        <a href="https://github.com/KhalilHsu" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
      </nav>
    </div>
  </div>
</header>`;

const postItem = (post, prefix, mediaPrefix) => `
<article class="post-item">
  <a class="list-cover" href="${prefix}${post.slug}/">
    <div class="cover-frame">
      <img src="${mediaPrefix}${escapeHtml(post.cover)}" alt="" loading="lazy">
    </div>
  </a>
  <div class="post-copy">
    <div class="post-meta-top">
      <time datetime="${post.date}" class="post-date-dot">${formatDateDot(post.date)}</time>
      <time datetime="${post.date}" class="post-date-badge">${formatDateShort(post.date)}</time>
      <div class="post-tags-container">
        <p class="tag">${escapeHtml(post.tags)}</p>
        <div class="tag-badges">${renderTagBadges(post.tags)}</div>
      </div>
    </div>
    <h2><a href="${prefix}${post.slug}/">${escapeHtml(post.title)}</a></h2>
    <p class="summary">${escapeHtml(post.summary)}</p>
    <time datetime="${post.date}" class="post-date-bottom">${formatDateDot(post.date)}</time>
  </div>
</article>`;

const archiveItem = (post, prefix) => `
<article class="archive-item">
  <time datetime="${post.date}" class="archive-date">${formatDateDot(post.date)}</time>
  <a href="${prefix}${post.slug}/" class="archive-title">${escapeHtml(post.title)}</a>
  <div class="archive-tags">
    <span class="archive-tag-raw">${escapeHtml(post.tags)}</span>
    <div class="archive-tag-badges">${renderTagBadges(post.tags)}</div>
  </div>
</article>`;

const pageSize = 50;

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "archive"), { recursive: true });
await mkdir(path.join(outputDirectory, "post"), { recursive: true });
try { await cp(path.join(contentDirectory, "media"), path.join(outputDirectory, "media"), { recursive: true }); } catch (error) { if (error.code !== "ENOENT") throw error; }

const faviconFiles = ["favicon.svg", "favicon.png", "favicon.ico", "apple-touch-icon.png"];
for (const file of faviconFiles) {
  try {
    await cp(path.join(contentDirectory, file), path.join(outputDirectory, file));
  } catch (e) {}
}

const filenames = (await readdir(contentDirectory)).filter((name) => name.endsWith(".md"));
const posts = (await Promise.all(filenames.map(async (filename) => parsePost(await readFile(path.join(contentDirectory, filename), "utf8"), filename)))).sort((a, b) => b.date.localeCompare(a.date));

const latestPosts = posts.slice(0, 12);
const introduction = `
<main class="page">
  <div class="page-intro-editorial">
    <p class="eyebrow">PERSONAL NOTES</p>
    <h1>KH Field Notes</h1>
    <p class="intro">一些做过的事、注意到的东西，和还没想清楚的问题。</p>
  </div>
  <section class="post-list" aria-label="最新文章">
    ${latestPosts.map((post) => postItem(post, "post/", "")).join("\n")}
  </section>
  ${posts.length > latestPosts.length ? `<p class="archive-link"><a href="archive/">查看全部 ${posts.length} 篇文章 →</a></p>` : ""}
</main>`;

await writeFile(path.join(outputDirectory, "index.html"), shell({ title: "KH Field Notes", description: "一些做过的事、注意到的东西，和还没想清楚的问题。", content: `${header("./", "archive/", "home")}${introduction}`, stylesheet: "styles.css", assetPrefix: "" }));

for (let page = 1; page <= Math.ceil(posts.length / pageSize); page += 1) {
  const slice = posts.slice((page - 1) * pageSize, page * pageSize);
  const previous = page > 1 ? `<a href="../">← 较新的文章</a>` : "";
  const next = page < Math.ceil(posts.length / pageSize) ? `<a href="${page === 1 ? "page/2/" : `../${page + 1}/`}">较早的文章 →</a>` : "";
  const pagination = previous || next ? `<p class="archive-link">${previous}${previous && next ? "　" : ""}${next}</p>` : "";
  const archive = `
<main class="page">
  <div class="page-intro-editorial">
    <p class="eyebrow">ALL POSTS · ${posts.length}</p>
    <h1>归档</h1>
  </div>
  <section class="archive-list">${slice.map((post) => archiveItem(post, "../post/")).join("\n")}</section>
  ${pagination}
</main>`;
  const directory = page === 1 ? path.join(outputDirectory, "archive") : path.join(outputDirectory, "archive", "page", String(page));
  await mkdir(directory, { recursive: true });
  const depth = page === 1 ? "../" : "../../../";
  await writeFile(path.join(directory, "index.html"), shell({ title: "归档", description: "KH Field Notes 的所有文章。", content: `${header(depth, "./", "archive")}${archive}`, stylesheet: `${depth}styles.css`, assetPrefix: depth }));
}

for (const post of posts) {
  const directory = path.join(outputDirectory, "post", post.slug);
  await mkdir(directory, { recursive: true });
  const article = `
<main class="article">
  <div class="article-meta-header">
    <div class="article-tags-wrapper">
      <p class="tag">${escapeHtml(post.tags)}</p>
      <div class="tag-badges">${renderTagBadges(post.tags)}</div>
    </div>
    <time datetime="${post.date}" class="article-date">${formatDateDot(post.date)}</time>
  </div>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="lead">${escapeHtml(post.summary)}</p>
  <div class="article-body">${paragraphize(post.body, "../../")}</div>
  <a class="back" href="../../">← 返回文章列表</a>
</main>`;
  await writeFile(path.join(directory, "index.html"), shell({ title: post.title, description: post.summary, content: `${header("../../", "../../archive/", "article")}${article}`, stylesheet: "../../styles.css", assetPrefix: "../../" }));
}

const css = `
/* ==========================================================================
   Base & Reset
   ========================================================================== */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
  transition: background-color 0.25s ease;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.16);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
  border: 2px solid transparent;
  background-clip: content-box;
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
   Collapsible & Expandable Floating Theme Dock (Pure & Elegant)
   ========================================================================== */
.floating-theme-dock {
  position: fixed;
  z-index: 99999;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 8px;
  border-radius: 9999px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  cursor: grab;
  will-change: left, right, top, bottom;
  box-sizing: border-box;
  width: fit-content;
  max-width: calc(100vw - 36px);
  transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.floating-theme-dock.is-dragging {
  cursor: grabbing;
  transform: scale(1.02);
}

.dock-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  color: currentColor;
  cursor: grab;
  padding: 6px 6px;
  border-radius: 9999px;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}

.dock-handle:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

.floating-theme-dock.is-dragging .dock-handle {
  cursor: grabbing;
  opacity: 1;
  background: rgba(0, 0, 0, 0.12);
}

.theme-switcher {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 9999px;
  gap: 2px;
  white-space: nowrap;
}

.theme-seg-btn {
  border: none;
  background: transparent;
  font: 500 12.5px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: inherit;
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  
  /* Smooth natural width collapse & expansion */
  transition: max-width 0.26s cubic-bezier(0.2, 0, 0, 1),
              padding 0.26s cubic-bezier(0.2, 0, 0, 1),
              margin 0.26s cubic-bezier(0.2, 0, 0, 1),
              opacity 0.2s ease,
              background-color 0.2s ease,
              color 0.2s ease,
              box-shadow 0.2s ease;
  overflow: hidden;
}

/* 1. COLLAPSED STATE (Default view): Non-active button folds away */
.floating-theme-dock:not(.is-expanded) .theme-seg-btn:not(.active) {
  max-width: 0;
  padding-left: 0;
  padding-right: 0;
  margin-left: 0;
  margin-right: 0;
  opacity: 0;
  pointer-events: none;
}

.floating-theme-dock .theme-seg-btn.active {
  max-width: 140px;
  padding: 6px 14px;
  opacity: 1;
  pointer-events: auto;
}

/* 2. EXPANDED STATE (Active when .is-expanded is present on the dock) */
.floating-theme-dock.is-expanded .theme-seg-btn {
  max-width: 140px;
  padding: 6px 14px;
  opacity: 0.65;
  pointer-events: auto;
}

.floating-theme-dock.is-expanded .theme-seg-btn:hover {
  opacity: 1;
}

.floating-theme-dock.is-expanded .theme-seg-btn.active {
  opacity: 1;
  font-weight: 600;
}

/* ==========================================================================
   THEME 1: Editorial (经典报刊 · 默认)
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

/* Header Editorial mode */
html[data-theme="editorial"] .site-header {
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 28px 24px;
  border-bottom: 1px solid var(--rule);
}

html[data-theme="editorial"] .site-header-editorial-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

html[data-theme="editorial"] .site-header-mag-masthead {
  display: none;
}

html[data-theme="editorial"] .site-title {
  font: 600 18px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.02em;
  color: inherit;
  text-decoration: none;
}

html[data-theme="editorial"] .nav-editorial {
  display: flex;
  gap: 20px;
  font: 14px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
}

html[data-theme="editorial"] .nav-editorial a {
  color: var(--muted);
  text-decoration: none;
}

html[data-theme="editorial"] .nav-editorial a:hover,
html[data-theme="editorial"] .nav-editorial a.is-active {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Page Editorial mode */
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

html[data-theme="editorial"] .cover-frame {
  width: 100%;
  height: 100%;
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

html[data-theme="editorial"] .post-date-badge,
html[data-theme="editorial"] .post-date-top,
html[data-theme="editorial"] .tag-badges,
html[data-theme="editorial"] .archive-tag-badges {
  display: none;
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

html[data-theme="editorial"] .post-date-bottom {
  display: block;
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

/* Article detail Editorial mode */
html[data-theme="editorial"] .article {
  max-width: 1080px;
  margin: 0 auto;
  padding: 72px 28px 96px;
}

html[data-theme="editorial"] .article-meta-header {
  margin-bottom: 16px;
}

html[data-theme="editorial"] .article-meta-header .tag {
  margin: 0 0 14px;
}

html[data-theme="editorial"] .article-date {
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

/* Editorial Floating Dock Styling */
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

html[data-theme="editorial"] .floating-theme-dock .theme-seg-btn.active {
  background: #ffffff;
  color: #161513;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

html[data-theme="editorial"] .floating-theme-dock.is-dragging {
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
}


/* ==========================================================================
   THEME 2: Magazine / Quirky Orbit (画报潮流 · 复刻参考图视觉)
   ========================================================================== */
html[data-theme="magazine"],
html[data-theme="cards"] {
  --mag-bg: #ffffff;
  --mag-black: #000000;
  --mag-border: 2px solid #000000;
  --mag-border-thick: 2.5px solid #000000;
  --font-impact: Impact, "Arial Narrow", "Haettenschweiler", "Franklin Gothic Medium", -apple-system, sans-serif;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--mag-bg);
}

html[data-theme="magazine"] body,
html[data-theme="cards"] body {
  color: #000000;
  font-family: var(--font-sans);
  background: #ffffff;
}

/* Hide editorial masthead in Magazine mode */
html[data-theme="magazine"] .site-header-editorial-bar,
html[data-theme="cards"] .site-header-editorial-bar {
  display: none;
}

html[data-theme="magazine"] .page-intro-editorial,
html[data-theme="cards"] .page-intro-editorial {
  display: none;
}

/* Magazine Masthead */
html[data-theme="magazine"] .site-header,
html[data-theme="cards"] .site-header {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 24px 0;
}

html[data-theme="magazine"] .site-header-mag-masthead,
html[data-theme="cards"] .site-header-mag-masthead {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

html[data-theme="magazine"] .mag-masthead-main,
html[data-theme="cards"] .mag-masthead-main {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0 16px;
}

html[data-theme="magazine"] .mag-logo,
html[data-theme="cards"] .mag-logo {
  font-family: var(--font-impact);
  font-size: clamp(52px, 8.8vw, 106px);
  line-height: 0.88;
  letter-spacing: -0.025em;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
  font-weight: 900;
}

html[data-theme="magazine"] .mag-slogan,
html[data-theme="cards"] .mag-slogan {
  display: flex;
  flex-direction: column;
  font-family: var(--font-impact);
  font-size: clamp(16px, 2.3vw, 26px);
  line-height: 0.96;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  text-align: left;
  max-width: 380px;
  color: #000000;
  padding-bottom: 4px;
}

/* Primary Bar: Black Outline Box */
html[data-theme="magazine"] .mag-bar-primary,
html[data-theme="cards"] .mag-bar-primary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: var(--mag-border-thick);
  padding: 10px 18px;
  background: #ffffff;
}

html[data-theme="magazine"] .mag-crumb,
html[data-theme="cards"] .mag-crumb {
  font-family: var(--font-impact);
  font-size: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
}

html[data-theme="magazine"] .mag-nav-links,
html[data-theme="cards"] .mag-nav-links {
  display: flex;
  align-items: center;
  gap: 26px;
}

html[data-theme="magazine"] .mag-nav-links a,
html[data-theme="cards"] .mag-nav-links a {
  font-family: var(--font-impact);
  font-size: 18px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

html[data-theme="magazine"] .mag-nav-links a:hover,
html[data-theme="cards"] .mag-nav-links a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="magazine"] .mag-nav-links a.is-current,
html[data-theme="cards"] .mag-nav-links a.is-current {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Page Layout */
html[data-theme="magazine"] .page,
html[data-theme="cards"] .page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

/* Masonry column layout — items flow vertically, no forced row alignment */
html[data-theme="magazine"] .post-list,
html[data-theme="cards"] .post-list {
  column-count: 4;
  column-gap: 20px;
  margin-top: 16px;
  border: none;
}

html[data-theme="magazine"] .post-item,
html[data-theme="cards"] .post-item {
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  background: #ffffff;
  padding: 0;
  border: none;
  min-height: 0;
  margin-bottom: 28px;
}

/* Colorful Frame Variations */
html[data-theme="magazine"] .list-cover,
html[data-theme="cards"] .list-cover {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  text-decoration: none;
}

html[data-theme="magazine"] .cover-frame,
html[data-theme="cards"] .cover-frame {
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f4;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

html[data-theme="magazine"] .post-item:hover .cover-frame,
html[data-theme="cards"] .post-item:hover .cover-frame {
  transform: translateY(-3px);
}

html[data-theme="magazine"] .cover-frame img,
html[data-theme="cards"] .cover-frame img {
  width: 100%;
  height: auto;
  display: block;
}

/* Frame color scheme mapping — all cards get a consistent 7px colored border */
/* Card 1: Warm Beige */
html[data-theme="magazine"] .post-item:nth-child(8n + 1) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 1) .cover-frame {
  border: 7px solid #d4c9b8;
}

/* Card 2: Bright Orange */
html[data-theme="magazine"] .post-item:nth-child(8n + 2) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 2) .cover-frame {
  border: 7px solid #f99f38;
}

/* Card 3: Ink Black */
html[data-theme="magazine"] .post-item:nth-child(8n + 3) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 3) .cover-frame {
  border: 7px solid #1a1a1a;
}

/* Card 4: Olive Green */
html[data-theme="magazine"] .post-item:nth-child(8n + 4) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 4) .cover-frame {
  border: 7px solid #a3cc69;
}

/* Card 5: Neon Pink */
html[data-theme="magazine"] .post-item:nth-child(8n + 5) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 5) .cover-frame {
  border: 7px solid #ff2a9d;
}

/* Card 6: Warm Amber */
html[data-theme="magazine"] .post-item:nth-child(8n + 6) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 6) .cover-frame {
  border: 7px solid #f59e0b;
}

/* Card 7: Lavender Purple */
html[data-theme="magazine"] .post-item:nth-child(8n + 7) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 7) .cover-frame {
  border: 7px solid #c084fc;
}

/* Card 8: Electric Cyan */
html[data-theme="magazine"] .post-item:nth-child(8n + 8) .cover-frame,
html[data-theme="cards"] .post-item:nth-child(8n + 8) .cover-frame {
  border: 7px solid #38bdf8;
}

/* Post Copy in Magazine mode */
html[data-theme="magazine"] .post-copy,
html[data-theme="cards"] .post-copy {
  display: flex;
  flex-direction: column;
}

html[data-theme="magazine"] .post-item h2,
html[data-theme="cards"] .post-item h2 {
  font-family: var(--font-impact);
  font-size: 23px;
  line-height: 1.14;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  font-weight: 900;
  margin: 0 0 10px;
  color: #000000;
}

html[data-theme="magazine"] .post-item h2 a,
html[data-theme="cards"] .post-item h2 a {
  color: #000000;
  text-decoration: none;
}

html[data-theme="magazine"] .post-item h2 a:hover,
html[data-theme="cards"] .post-item h2 a:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Hide editorial elements */
html[data-theme="magazine"] .post-date-dot,
html[data-theme="magazine"] .post-date-bottom,
html[data-theme="magazine"] .post-tags-container .tag,
html[data-theme="cards"] .post-date-dot,
html[data-theme="cards"] .post-date-bottom,
html[data-theme="cards"] .post-tags-container .tag {
  display: none;
}

/* Show Magazine Meta Badges */
html[data-theme="magazine"] .post-meta-top,
html[data-theme="cards"] .post-meta-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

html[data-theme="magazine"] .post-date-badge,
html[data-theme="cards"] .post-date-badge {
  display: inline-block;
  font-family: var(--font-impact);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #000000;
  margin-right: 2px;
}

html[data-theme="magazine"] .tag-badges,
html[data-theme="cards"] .tag-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 5px;
}

html[data-theme="magazine"] .tag-badge,
html[data-theme="cards"] .tag-badge {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid #000000;
  padding: 2px 7px;
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: #ffffff;
  color: #000000;
  line-height: 1.2;
}

html[data-theme="magazine"] .summary,
html[data-theme="cards"] .summary {
  display: none;
}

/* Archive page Magazine Mode */
html[data-theme="magazine"] .archive-list,
html[data-theme="cards"] .archive-list {
  display: grid;
  gap: 8px;
  margin-top: 24px;
  border-top: none;
}

html[data-theme="magazine"] .archive-item,
html[data-theme="cards"] .archive-item {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
  border: var(--mag-border);
  background: #ffffff;
  transition: transform 0.15s ease, background 0.15s ease;
}

html[data-theme="magazine"] .archive-item:hover,
html[data-theme="cards"] .archive-item:hover {
  background: #f9f9f9;
  transform: translateX(4px);
}

html[data-theme="magazine"] .archive-date,
html[data-theme="cards"] .archive-date {
  font-family: var(--font-impact);
  font-size: 15px;
  letter-spacing: 0.04em;
  color: #000000;
}

html[data-theme="magazine"] .archive-title,
html[data-theme="cards"] .archive-title {
  font-family: var(--font-impact);
  font-size: 19px;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
  letter-spacing: -0.01em;
}

html[data-theme="magazine"] .archive-title:hover,
html[data-theme="cards"] .archive-title:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="magazine"] .archive-tag-raw,
html[data-theme="cards"] .archive-tag-raw {
  display: none;
}

html[data-theme="magazine"] .archive-tag-badges,
html[data-theme="cards"] .archive-tag-badges {
  display: flex;
  gap: 6px;
}

html[data-theme="magazine"] .archive-link,
html[data-theme="cards"] .archive-link {
  margin-top: 36px;
}

html[data-theme="magazine"] .archive-link a,
html[data-theme="cards"] .archive-link a {
  display: inline-block;
  border: var(--mag-border-thick);
  padding: 8px 18px;
  font-family: var(--font-impact);
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
  background: #ffffff;
  box-shadow: 3px 3px 0 #000000;
  transition: all 0.15s ease;
}

html[data-theme="magazine"] .archive-link a:hover,
html[data-theme="cards"] .archive-link a:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 #000000;
}

/* Article detail Magazine Mode */
html[data-theme="magazine"] .article,
html[data-theme="cards"] .article {
  max-width: 1240px;
  margin: 28px auto 96px;
  padding: 0 24px;
}

html[data-theme="magazine"] .article-meta-header,
html[data-theme="cards"] .article-meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--mag-border-thick);
  padding-bottom: 14px;
  margin-bottom: 24px;
}

html[data-theme="magazine"] .article-meta-header .tag,
html[data-theme="cards"] .article-meta-header .tag {
  display: none;
}

html[data-theme="magazine"] .article-date,
html[data-theme="cards"] .article-date {
  font-family: var(--font-impact);
  font-size: 16px;
  letter-spacing: 0.05em;
  color: #000000;
}

html[data-theme="magazine"] .article h1,
html[data-theme="cards"] .article h1 {
  font-family: var(--font-impact);
  font-size: clamp(40px, 6.5vw, 68px);
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.05;
  text-transform: uppercase;
  margin: 0 0 24px;
  color: #000000;
}

html[data-theme="magazine"] .lead,
html[data-theme="cards"] .lead {
  font-size: 20px;
  line-height: 1.6;
  font-weight: 500;
  color: #222222;
  border-left: 5px solid #000000;
  padding: 6px 0 6px 20px;
  margin: 0 0 44px;
}

html[data-theme="magazine"] .article-body,
html[data-theme="cards"] .article-body {
  font-size: 18px;
  line-height: 1.85;
  color: #111111;
}

html[data-theme="magazine"] .article-body p,
html[data-theme="cards"] .article-body p {
  margin: 0 0 1.6em;
}

html[data-theme="magazine"] .article-body figure,
html[data-theme="cards"] .article-body figure {
  margin: 2.5em 0;
  border: 7px solid #f99f38;
  background: #000;
}

html[data-theme="magazine"] .article-body img,
html[data-theme="cards"] .article-body img {
  width: 100%;
}

html[data-theme="magazine"] .article-body figcaption,
html[data-theme="cards"] .article-body figcaption {
  padding: 8px 12px;
  background: #ffffff;
  color: #000000;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  border-top: 1.5px solid #000000;
}

html[data-theme="magazine"] .article-body code,
html[data-theme="cards"] .article-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.88em;
  background: #f0f0f0;
  border: 1px solid #000000;
  padding: 2px 6px;
  border-radius: 2px;
  color: #000000;
}

html[data-theme="magazine"] .article-body pre,
html[data-theme="cards"] .article-body pre {
  background: #f9f9f9;
  border: var(--mag-border);
  padding: 18px 22px;
  border-radius: 0;
  box-shadow: 4px 4px 0 #000000;
  margin: 2em 0;
}

html[data-theme="magazine"] .article-body pre code,
html[data-theme="cards"] .article-body pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
}

html[data-theme="magazine"] .article-body a,
html[data-theme="cards"] .article-body a {
  color: #000000;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-theme="magazine"] .back,
html[data-theme="cards"] .back {
  display: inline-block;
  margin-top: 48px;
  border: var(--mag-border-thick);
  padding: 9px 20px;
  font-family: var(--font-impact);
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #000000;
  text-decoration: none;
  background: #ffffff;
  box-shadow: 3px 3px 0 #000000;
  transition: all 0.15s ease;
}

html[data-theme="magazine"] .back:hover,
html[data-theme="cards"] .back:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 #000000;
}

/* Magazine Floating Dock Styling */
html[data-theme="magazine"] .floating-theme-dock,
html[data-theme="cards"] .floating-theme-dock {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0 #000000;
  color: #000000;
}

html[data-theme="magazine"] .floating-theme-dock .theme-switcher,
html[data-theme="cards"] .floating-theme-dock .theme-switcher {
  background: #f0f0f0;
  border: 1.5px solid #000000;
}

html[data-theme="magazine"] .floating-theme-dock .theme-seg-btn.active,
html[data-theme="cards"] .floating-theme-dock .theme-seg-btn.active {
  background: #000000;
  color: #ffffff;
  font-weight: 700;
  box-shadow: none;
}

html[data-theme="magazine"] .floating-theme-dock.is-dragging,
html[data-theme="cards"] .floating-theme-dock.is-dragging {
  box-shadow: 7px 7px 0 #000000;
}

/* ==========================================================================
   Responsive Adaptations
   ========================================================================== */
@media (max-width: 1024px) {
  html[data-theme="magazine"] .post-list,
  html[data-theme="cards"] .post-list {
    column-count: 3;
  }
}

@media (max-width: 768px) {
  .site-header {
    padding: 20px 18px 0;
  }
  .page {
    padding: 24px 18px 60px;
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
  html[data-theme="magazine"] .mag-masthead-main,
  html[data-theme="cards"] .mag-masthead-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  html[data-theme="magazine"] .post-list,
  html[data-theme="cards"] .post-list {
    column-count: 2;
    column-gap: 16px;
  }
  html[data-theme="magazine"] .archive-item,
  html[data-theme="cards"] .archive-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  html[data-theme="magazine"] .post-list,
  html[data-theme="cards"] .post-list {
    column-count: 1;
  }
}
`;

await writeFile(path.join(outputDirectory, "styles.css"), css.trim());
console.log(`Built ${posts.length} posts in dist/ with clean and balanced collapsible floating dock.`);
