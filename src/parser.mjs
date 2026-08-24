import path from "node:path";

export const fallbackCover = "media/placeholder-cover.png";

export const escapeHtml = (value) =>
  value.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);

export function paragraphize(body, imagePrefix) {
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

    const mediaMatches = [...trimmed.matchAll(/(?:@video|!)\[([^\]]*)\]\(([^)\s]+)\)/gi)];
    const withoutMedia = trimmed.replace(/(?:@video|!)\[([^\]]*)\]\(([^)\s]+)\)/gi, "").trim();

    if (mediaMatches.length > 0 && withoutMedia === "") {
      if (mediaMatches.length === 1) {
        const alt = escapeHtml(mediaMatches[0][1]);
        const rawSrc = mediaMatches[0][2];
        const isExternal = /^https?:\/\//i.test(rawSrc);
        const src = isExternal ? escapeHtml(rawSrc) : `${imagePrefix}${escapeHtml(rawSrc)}`;
        const isVideo = mediaMatches[0][0].startsWith("@video") || /\.(mp4|mov|webm|m4v|ogg)$/i.test(rawSrc);
        if (isVideo) {
          return `<figure class="media-video"><video src="${src}" controls playsinline preload="metadata"></video>${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`;
        }
        return `<figure class="media-image"><img src="${src}" alt="${alt}" loading="lazy">${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`;
      }

      const itemsHtml = mediaMatches.map((m) => {
        const alt = escapeHtml(m[1]);
        const rawSrc = m[2];
        const isExternal = /^https?:\/\//i.test(rawSrc);
        const src = isExternal ? escapeHtml(rawSrc) : `${imagePrefix}${escapeHtml(rawSrc)}`;
        const isVideo = m[0].startsWith("@video") || /\.(mp4|mov|webm|m4v|ogg)$/i.test(rawSrc);
        if (isVideo) {
          return `<div class="media-grid-item"><video src="${src}" controls playsinline preload="metadata"></video>${alt ? `<figcaption>${alt}</figcaption>` : ""}</div>`;
        }
        return `<div class="media-grid-item"><img src="${src}" alt="${alt}" loading="lazy">${alt ? `<figcaption>${alt}</figcaption>` : ""}</div>`;
      }).join("\n");

      return `<figure class="media-grid media-grid-${mediaMatches.length}">\n${itemsHtml}\n</figure>`;
    }

    let html = escapeHtml(paragraph);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return `<p>${html.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

export function parsePost(source, filename) {
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
  return { ...metadata, cover: metadata.cover || fallbackCover, slug: path.basename(filename, ".md"), body: match[2].trim() };
}
