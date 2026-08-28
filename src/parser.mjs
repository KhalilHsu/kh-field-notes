import path from "node:path";

export const fallbackCover = "assets/placeholder-cover.png";

export const escapeHtml = (value) =>
  value.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);

export function renderInline(text) {
  let html = escapeHtml(text);
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+|\.\.?\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

export function paragraphize(body, imagePrefix = "") {
  const codeBlocks = [];
  const processedBody = body.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
    const placeholder = `<!--CODEBLOCK_${codeBlocks.length}-->`;
    codeBlocks.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  const rawBlocks = processedBody.trim().split(/\n\s*\n/);

  return rawBlocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // 1. Code Block placeholder
    if (trimmed.startsWith("<!--CODEBLOCK_") && trimmed.endsWith("-->")) {
      const idx = parseInt(trimmed.replace("<!--CODEBLOCK_", "").replace("-->", ""), 10);
      return codeBlocks[idx] || "";
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(?:---|[*]{3,}|_{3,})$/.test(trimmed)) {
      return "<hr>";
    }

    // 3. Media (Single image / video or multi-media grid)
    const mediaMatches = [...trimmed.matchAll(/(?:@video|!)\[([^\]]*)\]\(([^)\s]+)\)/gi)];
    const withoutMedia = trimmed.replace(/(?:@video|!)\[([^\]]*)\]\(([^)\s]+)\)/gi, "").trim();

    if (mediaMatches.length > 0 && withoutMedia === "") {
      const resolveSrc = (rawSrc) => {
        if (/^https?:\/\//i.test(rawSrc)) return escapeHtml(rawSrc);
        const normalized = rawSrc.replace(/^\.\//, "");
        return imagePrefix ? `${imagePrefix}${escapeHtml(normalized)}` : escapeHtml(normalized);
      };

      if (mediaMatches.length === 1) {
        const alt = escapeHtml(mediaMatches[0][1]);
        const rawSrc = mediaMatches[0][2];
        const src = resolveSrc(rawSrc);
        const isVideo = mediaMatches[0][0].startsWith("@video") || /\.(mp4|mov|webm|m4v|ogg)$/i.test(rawSrc);
        if (isVideo) {
          return `<figure class="media-video"><video src="${src}" controls playsinline preload="metadata"></video>${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`;
        }
        return `<figure class="media-image"><img src="${src}" alt="${alt}" loading="lazy">${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`;
      }

      const itemsHtml = mediaMatches.map((m) => {
        const alt = escapeHtml(m[1]);
        const rawSrc = m[2];
        const src = resolveSrc(rawSrc);
        const isVideo = m[0].startsWith("@video") || /\.(mp4|mov|webm|m4v|ogg)$/i.test(rawSrc);
        if (isVideo) {
          return `<div class="media-grid-item"><video src="${src}" controls playsinline preload="metadata"></video>${alt ? `<figcaption>${alt}</figcaption>` : ""}</div>`;
        }
        return `<div class="media-grid-item"><img src="${src}" alt="${alt}" loading="lazy">${alt ? `<figcaption>${alt}</figcaption>` : ""}</div>`;
      }).join("\n");

      return `<figure class="media-grid media-grid-${mediaMatches.length}">\n${itemsHtml}\n</figure>`;
    }

    // 4. Blockquote
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed
        .split(/\r?\n/)
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n");
      const lines = quoteText.split(/\r?\n/);
      const innerHtml = lines.map((l) => renderInline(l)).join("<br>");
      return `<blockquote><p>${innerHtml}</p></blockquote>`;
    }

    const lines = trimmed.split(/\r?\n/);

    // 5. Standalone Headings (#, ##, ###, ####)
    const singleHeadingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (singleHeadingMatch && !trimmed.includes("\n")) {
      const level = singleHeadingMatch[1].length;
      return `<h${level}>${renderInline(singleHeadingMatch[2])}</h${level}>`;
    }

    // 6. Check for structured lines (headings, lists, paragraphs)
    const hasSpecialSyntax = lines.some((line) => {
      const t = line.trim();
      return /^(#{1,6})\s+/.test(t) || /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t);
    });

    if (hasSpecialSyntax) {
      const htmlChunks = [];
      let currentParagraph = [];
      let currentList = null;

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          htmlChunks.push(`<p>${currentParagraph.map(renderInline).join("<br>")}</p>`);
          currentParagraph = [];
        }
      };

      const flushList = () => {
        if (currentList) {
          const tag = currentList.type;
          const startAttr = currentList.type === "ol" && currentList.start && currentList.start !== 1 ? ` start="${currentList.start}"` : "";
          const lis = currentList.items.map((it) => `<li>${renderInline(it)}</li>`).join("\n");
          htmlChunks.push(`<${tag}${startAttr}>\n${lis}\n</${tag}>`);
          currentList = null;
        }
      };

      for (const line of lines) {
        const tLine = line.trim();
        if (!tLine) continue;

        const hMatch = tLine.match(/^(#{1,6})\s+(.*)$/);
        const ulMatch = tLine.match(/^[-*]\s+(.*)$/);
        const olMatch = tLine.match(/^(\d+)\.\s+(.*)$/);

        if (hMatch) {
          flushParagraph();
          flushList();
          const level = hMatch[1].length;
          htmlChunks.push(`<h${level}>${renderInline(hMatch[2])}</h${level}>`);
        } else if (ulMatch) {
          flushParagraph();
          if (currentList && currentList.type !== "ul") flushList();
          if (!currentList) currentList = { type: "ul", items: [] };
          currentList.items.push(ulMatch[1]);
        } else if (olMatch) {
          flushParagraph();
          if (currentList && currentList.type !== "ol") flushList();
          const startNum = parseInt(olMatch[1], 10);
          if (!currentList) currentList = { type: "ol", start: startNum, items: [] };
          currentList.items.push(olMatch[2]);
        } else {
          flushList();
          currentParagraph.push(tLine);
        }
      }
      flushParagraph();
      flushList();
      return htmlChunks.join("\n");
    }

    // Default plain paragraph
    return `<p>${lines.map(renderInline).join("<br>")}</p>`;
  }).filter(Boolean).join("\n");
}

export function parsePost(source, filename, explicitSlug) {
  const normalized = source.replace(/^\uFEFF/, "").trimStart();
  const match = normalized.match(/^(?:---|[*]{3,}|-{3,})\r?\n([\s\S]*?)\r?\n(?:---|[*]{3,}|-{3,})\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filename} needs front matter.`);
  const metadata = Object.fromEntries(
    match[1]
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.includes(":") && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
  const slug = explicitSlug || (filename.endsWith(".md") && path.basename(filename, ".md") !== "index" ? path.basename(filename, ".md") : path.basename(path.dirname(filename)));
  
  let cover = metadata.cover ? metadata.cover.replace(/^\.\//, "").replace(/^media\//, "") : "";
  let isFallbackCover = false;
  if (!cover) {
    cover = fallbackCover;
    isFallbackCover = true;
  }

  return { ...metadata, cover, isFallbackCover, slug, body: match[2].trim() };
}
