import { escapeHtml } from "./parser.mjs";

export const formatDateDot = (value) => value.replaceAll("-", ".");

export const formatDateShort = (value) => {
  try {
    const [, month, day] = value.split("-");
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${months[parseInt(month, 10) - 1] || month} ${day}`;
  } catch {
    return value;
  }
};

export const renderTagBadges = (tagsStr) =>
  tagsStr.split("/").map((t) => t.trim()).filter(Boolean)
    .map((t) => `<span class="tag-badge">${escapeHtml(t)}</span>`).join("");

export function shell({ title, description, content, stylesheet, assetPrefix = "" }) {
  const pageTitle = title === "Random Shit" ? "Random Shit · Khalil" : (title ? `${title} · Khalil` : "Khalil's Random Shit");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="icon" href="${assetPrefix}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${assetPrefix}favicon.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="${assetPrefix}apple-touch-icon.png">
  <link rel="preload" href="${assetPrefix}assets/fonts/cormorant-garamond-700.woff2" as="font" type="font/woff2" crossorigin>
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
      <button type="button" class="theme-seg-btn" data-theme-val="editorial" role="radio" title="经典报刊 (Editorial)" aria-label="经典报刊">
        <svg width="14.5" height="14.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5L12.5 3.5c.8-1.5 2.8-1 2.8.8 0 3.6-3.2 10.6-4.5 15.2"/><path d="M10.8 12c1.6-1.5 4.5-1.5 4.6 1 .2 2.2-2.2 2.8-4.2 2.8 2.5.5 5.5 1.2 8.5 2.5"/></svg>
      </button>
      <button type="button" class="theme-seg-btn" data-theme-val="magazine" role="radio" title="画报潮流 (Magazine)" aria-label="画报潮流">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.2 4h3.8l5 9.4 5-9.4h3.8v16h-3.4V8.5l-4.4 8.2h-2L6.6 8.5V20H3.2V4z"/></svg>
      </button>
      <button type="button" class="theme-seg-btn" data-theme-val="cyberdeck" role="radio" title="深潜终端 (Cyberdeck)" aria-label="深潜终端">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.2 4h3.8l5 13.2L17 4h3.8L13.8 20h-3.6L3.2 4z"/></svg>
      </button>
    </div>
  </aside>

  <script>
    (function() {
      var postList = document.querySelector('.post-list');
      var originalPosts = postList ? Array.from(postList.querySelectorAll('.post-item')) : [];
      var currentLayoutCols = 0;
      var currentLayoutTheme = '';

      function getMagazineCols() {
        var w = window.innerWidth;
        if (w <= 480) return 1;
        if (w <= 768) return 2;
        if (w <= 1024) return 3;
        return 4;
      }

      function updateMagazineLayout(targetTheme) {
        if (!postList || originalPosts.length === 0) return;
        var t = targetTheme || document.documentElement.getAttribute('data-theme') || 'editorial';
        if (t === 'cards') t = 'magazine';

        if (t !== 'magazine') {
          if (currentLayoutTheme === 'magazine' || postList.querySelector('.mag-col')) {
            postList.innerHTML = '';
            originalPosts.forEach(function(post) {
              postList.appendChild(post);
            });
            currentLayoutCols = 0;
          }
          currentLayoutTheme = t;
          return;
        }

        var targetCols = getMagazineCols();
        if (currentLayoutTheme === 'magazine' && currentLayoutCols === targetCols && postList.querySelector('.mag-col')) {
          return;
        }

        currentLayoutTheme = 'magazine';
        currentLayoutCols = targetCols;

        postList.innerHTML = '';
        var cols = [];
        for (var i = 0; i < targetCols; i++) {
          var col = document.createElement('div');
          col.className = 'mag-col';
          cols.push(col);
          postList.appendChild(col);
        }

        originalPosts.forEach(function(post, index) {
          cols[index % targetCols].appendChild(post);
        });
      }

      function syncTheme(theme) {
        var t = (theme === 'magazine' || theme === 'cards') ? 'magazine' : (theme === 'cyberdeck' ? 'cyberdeck' : 'editorial');
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('kh-theme', t); } catch(e) {}
        var buttons = document.querySelectorAll('.theme-seg-btn');
        buttons.forEach(function(btn) {
          var val = btn.getAttribute('data-theme-val');
          var active = (val === t) || (val === 'magazine' && t === 'cards');
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-checked', active ? 'true' : 'false');
        });
        updateMagazineLayout(t);
      }

      var savedTheme = localStorage.getItem('kh-theme') || 'editorial';
      syncTheme(savedTheme);
      updateMagazineLayout(savedTheme);

      window.addEventListener('resize', function() {
        var t = document.documentElement.getAttribute('data-theme');
        if (t === 'magazine' || t === 'cards') {
          updateMagazineLayout('magazine');
        }
      });

      var themeButtons = document.querySelectorAll('.theme-seg-btn');
      themeButtons.forEach(function(btn) {
        btn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          syncTheme(this.getAttribute('data-theme-val'));
          this.blur();
        });
      });

      var dock = document.getElementById('themeDock');
      if (!dock) return;

      var switcher = dock.querySelector('.theme-switcher');
      if (switcher) {
        switcher.addEventListener('mouseenter', function() {
          if (!isDragging) dock.classList.add('is-expanded');
        });
      }

      dock.addEventListener('mouseleave', function() {
        if (!isDragging) dock.classList.remove('is-expanded');
      });

      var MARGIN = 18;
      var DRAG_THRESHOLD = 6;
      var currentX = 0, currentY = 0;
      var isPointerDown = false, isDragging = false;
      var startPointerX = 0, startPointerY = 0;
      var startDockX = 0, startDockY = 0;

      function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

      function applyPlacement(edge, x, y, animate) {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width || 110;
        var winW = window.innerWidth;
        dock.setAttribute('data-dock-edge', edge);
        dock.style.transition = animate ? 'top 0.3s cubic-bezier(0.2, 0, 0, 1), left 0.3s cubic-bezier(0.2, 0, 0, 1), right 0.3s cubic-bezier(0.2, 0, 0, 1), bottom 0.3s cubic-bezier(0.2, 0, 0, 1)' : 'none';
        if (edge === 'right') {
          dock.style.left = 'auto'; dock.style.right = MARGIN + 'px';
          dock.style.top = y + 'px'; dock.style.bottom = 'auto';
        } else if (edge === 'left') {
          dock.style.left = MARGIN + 'px'; dock.style.right = 'auto';
          dock.style.top = y + 'px'; dock.style.bottom = 'auto';
        } else if (edge === 'top') {
          var isRightSide = (x + dockW / 2) > (winW / 2);
          if (isRightSide) { dock.style.left = 'auto'; dock.style.right = Math.max(MARGIN, winW - x - dockW) + 'px'; }
          else { dock.style.left = Math.max(MARGIN, x) + 'px'; dock.style.right = 'auto'; }
          dock.style.top = MARGIN + 'px'; dock.style.bottom = 'auto';
        } else if (edge === 'bottom') {
          var isRightSide2 = (x + dockW / 2) > (winW / 2);
          if (isRightSide2) { dock.style.left = 'auto'; dock.style.right = Math.max(MARGIN, winW - x - dockW) + 'px'; }
          else { dock.style.left = Math.max(MARGIN, x) + 'px'; dock.style.right = 'auto'; }
          dock.style.top = 'auto'; dock.style.bottom = MARGIN + 'px';
        } else {
          dock.style.left = x + 'px'; dock.style.top = y + 'px';
          dock.style.right = 'auto'; dock.style.bottom = 'auto';
        }
        dock.style.transform = 'none';
        currentX = x; currentY = y;
      }

      function snapTo4Edges() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width, dockH = rect.height;
        var winW = window.innerWidth, winH = window.innerHeight;
        var minX = MARGIN, maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN, maxY = Math.max(MARGIN, winH - dockH - MARGIN);
        var distLeft = Math.abs(currentX - minX), distRight = Math.abs(maxX - currentX);
        var distTop = Math.abs(currentY - minY), distBottom = Math.abs(maxY - currentY);
        var minDist = Math.min(distLeft, distRight, distTop, distBottom);
        var targetX = clamp(currentX, minX, maxX), targetY = clamp(currentY, minY, maxY);
        var edge = 'right';
        if (minDist === distLeft) { targetX = minX; edge = 'left'; }
        else if (minDist === distRight) { targetX = maxX; edge = 'right'; }
        else if (minDist === distTop) { targetY = minY; edge = 'top'; }
        else if (minDist === distBottom) { targetY = maxY; edge = 'bottom'; }
        applyPlacement(edge, targetX, targetY, true);
        try {
          localStorage.setItem('kh-dock-pos', JSON.stringify({
            edge, x: targetX, y: targetY,
            ratioX: winW > 0 ? targetX / winW : 0.9,
            ratioY: winH > 0 ? targetY / winH : 0.9
          }));
        } catch(e) {}
      }

      function initDockPosition() {
        var rect = dock.getBoundingClientRect();
        var dockW = rect.width || 120, dockH = rect.height || 36;
        var winW = window.innerWidth, winH = window.innerHeight;
        var minX = MARGIN, maxX = Math.max(MARGIN, winW - dockW - MARGIN);
        var minY = MARGIN, maxY = Math.max(MARGIN, winH - dockH - MARGIN);
        var initEdge = 'bottom', initX = maxX, initY = maxY;
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
      window.addEventListener('resize', function() { snapTo4Edges(); });

      dock.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        isPointerDown = true; isDragging = false;
        startPointerX = e.clientX; startPointerY = e.clientY;
        var rect = dock.getBoundingClientRect();
        startDockX = rect.left; startDockY = rect.top;
        currentX = rect.left; currentY = rect.top;
      });

      window.addEventListener('pointermove', function(e) {
        if (!isPointerDown) return;
        var dx = e.clientX - startPointerX, dy = e.clientY - startPointerY;
        if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          isDragging = true;
          dock.classList.add('is-dragging');
          dock.classList.remove('is-expanded');
          dock.style.transition = 'none';
        }
        if (isDragging) {
          var rect = dock.getBoundingClientRect();
          var winW = window.innerWidth, winH = window.innerHeight;
          var nextX = clamp(startDockX + dx, 0, winW - rect.width);
          var nextY = clamp(startDockY + dy, 0, winH - rect.height);
          dock.style.left = nextX + 'px'; dock.style.top = nextY + 'px';
          dock.style.right = 'auto'; dock.style.bottom = 'auto'; dock.style.transform = 'none';
          currentX = nextX; currentY = nextY;
        }
      });

      function handlePointerUp() {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (isDragging) {
          dock.classList.remove('is-dragging');
          dock.classList.remove('is-expanded');
          snapTo4Edges();
          setTimeout(function() { isDragging = false; }, 60);
        }
      }

      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    })();
  </script>
</body>
</html>`;
}

export const header = (home, archive, activePage = "home") => `
<header class="site-header">
  <div class="site-header-editorial-bar">
    <a class="site-title" href="${home}">
      <svg class="site-logo-icon" width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#141413"/>
        <g transform="translate(32, 32) scale(2.2) translate(-12, -12)">
          <path stroke="#faf9f6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5L12.5 3.5c.8-1.5 2.8-1 2.8.8 0 3.6-3.2 10.6-4.5 15.2"/>
          <path stroke="#faf9f6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M10.8 12c1.6-1.5 4.5-1.5 4.6 1 .2 2.2-2.2 2.8-4.2 2.8 2.5.5 5.5 1.2 8.5 2.5"/>
        </g>
      </svg>
      <span>Khalil</span>
    </a>
    <nav class="nav-editorial" aria-label="主导航">
      <a href="${home}" class="${activePage === "home" ? "is-active" : ""}">Blog</a>
      <a href="${archive}" class="${activePage === "archive" ? "is-active" : ""}">Archive</a>
      <a href="https://github.com/KhalilHsu" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </nav>
  </div>

  <div class="site-header-mag-masthead">
    <div class="mag-masthead-main">
      <a class="mag-logo" href="${home}">KHALIL'S RANDOM SHIT</a>
      <div class="mag-slogan">
        <span>NAVIGATING AI, TOOLS,</span>
        <span>INTERFACES &amp; CREATIVE</span>
        <span>RANDOM EXPERIMENTS</span>
      </div>
    </div>
    <div class="mag-bar-primary">
      <div class="mag-bar-left">
        <a href="${home}" class="mag-crumb ${activePage === "home" ? "is-current" : ""}">HOME</a>
      </div>
      <nav class="mag-nav-links" aria-label="画报导航">
        <a href="${home}" class="${activePage === "home" ? "is-current" : ""}">BLOG</a>
        <a href="${archive}" class="${activePage === "archive" ? "is-current" : ""}">ARCHIVE</a>
        <a href="https://github.com/KhalilHsu" target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
      </nav>
    </div>
  </div>

  <div class="site-header-cyber-masthead">
    <div class="cyber-masthead-main">
      <a class="cyber-logo" href="${home}"><span class="cyber-prompt-sym">&gt;</span> KHALIL<span class="cyber-cursor">_</span></a>
      <span class="cyber-status-pill">● ONLINE // NETRUNNER_V3.0</span>
    </div>
    <div class="cyber-bar-primary">
      <div class="cyber-bar-left">
        <span class="cyber-cli-prompt">root@random-shit:~$</span>
        <span class="cyber-cli-cmd">${activePage === "home" ? "ls -la ./blog" : (activePage === "archive" ? "cat ./archive" : "view ./article")}</span>
      </div>
      <nav class="cyber-nav-links" aria-label="深潜终端导航">
        <a href="${home}" class="${activePage === "home" ? "is-current" : ""}">[./BLOG]</a>
        <a href="${archive}" class="${activePage === "archive" ? "is-current" : ""}">[./ARCHIVE]</a>
        <a href="https://github.com/KhalilHsu" target="_blank" rel="noopener noreferrer">[./GITHUB ↗]</a>
      </nav>
    </div>
  </div>
</header>`;

export const postItem = (post, prefix = "post/", mediaPrefix = "", index) => {
  const coverSrc = post.isFallbackCover
    ? `${mediaPrefix}assets/placeholder-cover.png`
    : (post.cover.startsWith("http") ? post.cover : `${mediaPrefix}${prefix}${post.slug}/${post.cover}`);
  return `
<article class="post-item"${typeof index === "number" ? ` data-color-index="${index}"` : ""}>
  <a class="list-cover" href="${prefix}${post.slug}/">
    <div class="cover-frame">
      <img src="${coverSrc}" alt="" loading="lazy">
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
};

export const archiveItem = (post, prefix) => `
<article class="archive-item">
  <time datetime="${post.date}" class="archive-date">${formatDateDot(post.date)}</time>
  <a href="${prefix}${post.slug}/" class="archive-title">${escapeHtml(post.title)}</a>
  <div class="archive-tags">
    <span class="archive-tag-raw">${escapeHtml(post.tags)}</span>
    <div class="archive-tag-badges">${renderTagBadges(post.tags)}</div>
  </div>
</article>`;
