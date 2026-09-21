import { watch } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const contentDirectory = path.join(root, "content");
const outputDirectory = path.join(root, "dist");
const stylesDirectory = path.join(root, "src", "styles");
const assetsDirectory = path.join(contentDirectory, "assets");

async function loadStyles() {
  const files = ["base.css", "editorial.css", "magazine.css", "cyberdeck.css", "responsive.css"];
  const parts = await Promise.all(files.map((f) => readFile(path.join(stylesDirectory, f), "utf8")));
  return parts.join("\n");
}

function renderArticlePage({ post, locale, zhHref, enHref, stylesheet, assetPrefix, homeLink, archiveLink, backToListText, fallbackNoticeText, imagePrefix = "", shell, header, paragraphize }) {
  const fallbackBanner = post.isFallbackLang && fallbackNoticeText ? `
  <aside class="article-fallback-notice" role="note">
    <span class="fallback-icon">🌐</span>
    <span>${fallbackNoticeText}</span>
  </aside>` : "";

  const article = `
<main class="article">
  <div class="article-meta-header">
    <div class="article-tags-wrapper">
      <p class="tag">${post.tags}</p>
      <div class="tag-badges">${post.tags.split("/").map((t) => t.trim()).filter(Boolean).map((t) => `<span class="tag-badge">${t}</span>`).join("")}</div>
    </div>
    <time datetime="${post.date}" class="article-date">${post.date.replaceAll("-", ".")}</time>
  </div>
  <h1>${post.title}</h1>
  <p class="lead">${post.summary}</p>
  ${fallbackBanner}
  <div class="article-body">${paragraphize(post.body, imagePrefix)}</div>
  <a class="back" href="${homeLink}">${backToListText}</a>
</main>`;

  return shell({
    title: post.title,
    description: post.summary,
    content: `${header(homeLink, archiveLink, "article", { locale, zhHref, enHref })}${article}`,
    stylesheet,
    assetPrefix,
    locale,
    zhHref,
    enHref,
    alternates: [
      { lang: "zh-CN", href: zhHref },
      { lang: "en", href: enHref }
    ]
  });
}

export async function build() {
  const pageSize = 50;
  const updateKey = Date.now();
  const { parsePost, paragraphize } = await import(`./src/parser.mjs?t=${updateKey}`);
  const { shell, header, postItem, archiveItem } = await import(`./src/template.mjs?t=${updateKey}`);
  const { getT } = await import(`./src/i18n.mjs?t=${updateKey}`);

  const tZh = getT("zh");
  const tEn = getT("en");

  // Prepare directories
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(path.join(outputDirectory, "archive"), { recursive: true });
  await mkdir(path.join(outputDirectory, "post"), { recursive: true });
  await mkdir(path.join(outputDirectory, "assets"), { recursive: true });
  await mkdir(path.join(outputDirectory, "en"), { recursive: true });
  await mkdir(path.join(outputDirectory, "en", "archive"), { recursive: true });
  await mkdir(path.join(outputDirectory, "en", "post"), { recursive: true });

  // 1. Copy global assets (content/assets -> dist/assets & dist/)
  try {
    const assetFiles = await readdir(assetsDirectory);
    for (const file of assetFiles) {
      if (file.startsWith(".")) continue;
      const src = path.join(assetsDirectory, file);
      await cp(src, path.join(outputDirectory, "assets", file), { recursive: true, force: true });
      await cp(src, path.join(outputDirectory, file), { recursive: true, force: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Assets copy warning:", error.message);
  }

  // 2. Scan and parse post bundles from content/
  const entries = await readdir(contentDirectory, { withFileTypes: true });
  const zhPosts = [];
  const enPosts = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "assets" || entry.name === "media") continue;

    if (entry.isDirectory()) {
      const slug = entry.name;
      const postContentDir = path.join(contentDirectory, slug);
      const postOutputDir = path.join(outputDirectory, "post", slug);
      const enPostOutputDir = path.join(outputDirectory, "en", "post", slug);

      await mkdir(postOutputDir, { recursive: true });
      await mkdir(enPostOutputDir, { recursive: true });

      const files = await readdir(postContentDir);

      // Copy media files to dist/post/<slug>/ (media shared across all locales)
      for (const file of files) {
        if (file.endsWith(".md") || file.startsWith(".")) continue;
        await cp(path.join(postContentDir, file), path.join(postOutputDir, file), { recursive: true });
      }

      const zhFilename = files.find((f) => f === "index.zh.md") || files.find((f) => f === "index.md") || files.find((f) => f.endsWith(".md") && !f.includes(".en."));
      const enFilename = files.find((f) => f === "index.en.md") || files.find((f) => f.includes(".en.md") || f.endsWith(".en.md"));

      let zhPost = null;
      if (zhFilename) {
        const rawZhMd = await readFile(path.join(postContentDir, zhFilename), "utf8");
        zhPost = parsePost(rawZhMd, path.join(postContentDir, zhFilename), slug);
        zhPosts.push(zhPost);
      }

      let enPost = null;
      if (enFilename) {
        const rawEnMd = await readFile(path.join(postContentDir, enFilename), "utf8");
        enPost = parsePost(rawEnMd, path.join(postContentDir, enFilename), slug, zhPost ? { cover: zhPost.cover, date: zhPost.date, tags: zhPost.tags } : {});
        enPosts.push(enPost);
      }

      // Render Chinese post page
      if (zhPost) {
        const zhHtml = renderArticlePage({
          post: zhPost,
          locale: "zh",
          zhHref: "./",
          enHref: `../../en/post/${slug}/`,
          stylesheet: "../../styles.css",
          assetPrefix: "../../",
          homeLink: "../../",
          archiveLink: "../../archive/",
          backToListText: tZh.backToList,
          fallbackNoticeText: "",
          imagePrefix: "",
          shell,
          header,
          paragraphize
        });
        await writeFile(path.join(postOutputDir, "index.html"), zhHtml);
      }

      // Render English post page (genuine or fallback)
      const targetEnPost = enPost || (zhPost ? { ...zhPost, isFallbackLang: true } : null);
      if (targetEnPost) {
        const enHtml = renderArticlePage({
          post: targetEnPost,
          locale: "en",
          zhHref: `../../../post/${slug}/`,
          enHref: "./",
          stylesheet: "../../../styles.css",
          assetPrefix: "../../../",
          homeLink: "../../../en/",
          archiveLink: "../../../en/archive/",
          backToListText: tEn.backToList,
          fallbackNoticeText: targetEnPost.isFallbackLang ? tEn.fallbackNotice : "",
          imagePrefix: `../../../post/${slug}/`,
          shell,
          header,
          paragraphize
        });
        await writeFile(path.join(enPostOutputDir, "index.html"), enHtml);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // Loose markdown files in content/
      const isEn = entry.name.includes(".en.");
      const slug = path.basename(entry.name, ".md").replace(/\.(en|zh)$/, "");
      const postOutputDir = path.join(outputDirectory, "post", slug);
      const enPostOutputDir = path.join(outputDirectory, "en", "post", slug);
      await mkdir(postOutputDir, { recursive: true });
      await mkdir(enPostOutputDir, { recursive: true });

      const rawMd = await readFile(path.join(contentDirectory, entry.name), "utf8");
      const post = parsePost(rawMd, entry.name, slug);

      if (isEn) {
        enPosts.push(post);
        const enHtml = renderArticlePage({
          post,
          locale: "en",
          zhHref: `../../../post/${slug}/`,
          enHref: "./",
          stylesheet: "../../../styles.css",
          assetPrefix: "../../../",
          homeLink: "../../../en/",
          archiveLink: "../../../en/archive/",
          backToListText: tEn.backToList,
          fallbackNoticeText: "",
          imagePrefix: `../../../post/${slug}/`,
          shell,
          header,
          paragraphize
        });
        await writeFile(path.join(enPostOutputDir, "index.html"), enHtml);
      } else {
        zhPosts.push(post);
        const zhHtml = renderArticlePage({
          post,
          locale: "zh",
          zhHref: "./",
          enHref: `../../en/post/${slug}/`,
          stylesheet: "../../styles.css",
          assetPrefix: "../../",
          homeLink: "../../",
          archiveLink: "../../archive/",
          backToListText: tZh.backToList,
          fallbackNoticeText: "",
          imagePrefix: "",
          shell,
          header,
          paragraphize
        });
        await writeFile(path.join(postOutputDir, "index.html"), zhHtml);
      }
    }
  }

  zhPosts.sort((a, b) => b.date.localeCompare(a.date));
  enPosts.sort((a, b) => b.date.localeCompare(a.date));

  // Determine list of posts for English views (show translated posts first; include untranslated as fallback)
  const enTranslatedSlugs = new Set(enPosts.map((p) => p.slug));
  const untranslatedAsFallback = zhPosts
    .filter((p) => !enTranslatedSlugs.has(p.slug))
    .map((p) => ({ ...p, isFallbackLang: true }));
  const allEnPosts = [...enPosts, ...untranslatedAsFallback].sort((a, b) => b.date.localeCompare(a.date));

  // 3. Home pages (Chinese & English)
  // 3a. Chinese Home page
  const latestZhPosts = zhPosts.slice(0, 12);
  const zhIntro = `
<main class="page">
  <div class="page-intro-editorial">
    <h1>${tZh.siteIntroTitle}</h1>
    <p class="intro">${tZh.siteIntroDesc}</p>
    <div class="cyber-sys-info">
      <span>${tZh.cyberLoc}</span>
      <span>${tZh.cyberSys}</span>
    </div>
  </div>
  <section class="post-list" aria-label="${tZh.latestPostsAria}">
    ${latestZhPosts.map((post, i) => postItem(post, "post/", "", i + 1, "zh")).join("\n")}
  </section>
  ${zhPosts.length > latestZhPosts.length ? `<p class="archive-link"><a href="archive/">${tZh.viewAllPosts(zhPosts.length)}</a></p>` : ""}
</main>`;

  await writeFile(
    path.join(outputDirectory, "index.html"),
    shell({
      title: tZh.siteIntroTitle,
      description: tZh.siteIntroDesc,
      content: `${header("./", "archive/", "home", { locale: "zh", zhHref: "./", enHref: "en/" })}${zhIntro}`,
      stylesheet: "styles.css",
      assetPrefix: "",
      locale: "zh",
      zhHref: "./",
      enHref: "en/",
      alternates: [
        { lang: "zh-CN", href: "./" },
        { lang: "en", href: "en/" }
      ]
    })
  );

  // 3b. English Home page
  const latestEnPosts = allEnPosts.slice(0, 12);
  const enIntro = `
<main class="page">
  <div class="page-intro-editorial">
    <h1>${tEn.siteIntroTitle}</h1>
    <p class="intro">${tEn.siteIntroDesc}</p>
    <div class="cyber-sys-info">
      <span>${tEn.cyberLoc}</span>
      <span>${tEn.cyberSys}</span>
    </div>
  </div>
  <section class="post-list" aria-label="${tEn.latestPostsAria}">
    ${latestEnPosts.map((post, i) => postItem(post, "post/", "../", i + 1, "en")).join("\n")}
  </section>
  ${allEnPosts.length > latestEnPosts.length ? `<p class="archive-link"><a href="archive/">${tEn.viewAllPosts(allEnPosts.length)}</a></p>` : ""}
</main>`;

  await writeFile(
    path.join(outputDirectory, "en", "index.html"),
    shell({
      title: tEn.siteIntroTitle,
      description: tEn.siteIntroDesc,
      content: `${header("./", "archive/", "home", { locale: "en", zhHref: "../", enHref: "./" })}${enIntro}`,
      stylesheet: "../styles.css",
      assetPrefix: "../",
      locale: "en",
      zhHref: "../",
      enHref: "./",
      alternates: [
        { lang: "zh-CN", href: "../" },
        { lang: "en", href: "./" }
      ]
    })
  );

  // 4. Archive pages (Chinese & English)
  // 4a. Chinese Archive
  for (let page = 1; page <= Math.ceil(zhPosts.length / pageSize); page += 1) {
    const slice = zhPosts.slice((page - 1) * pageSize, page * pageSize);
    const previous = page > 1 ? `<a href="${page === 2 ? "../" : `../${page - 1}/`}">${tZh.newerPosts}</a>` : "";
    const next = page < Math.ceil(zhPosts.length / pageSize) ? `<a href="${page === 1 ? "page/2/" : `../${page + 1}/`}">${tZh.olderPosts}</a>` : "";
    const pagination = previous || next ? `<p class="archive-link">${previous}${previous && next ? "　" : ""}${next}</p>` : "";
    const archive = `
<main class="page">
  <div class="page-intro-editorial">
    <p class="eyebrow">${tZh.archiveEyebrow(zhPosts.length)}</p>
    <h1>${tZh.archiveTitle}</h1>
  </div>
  <section class="archive-list">${slice.map((post) => archiveItem(post, "../post/", "zh")).join("\n")}</section>
  ${pagination}
</main>`;
    const directory = page === 1 ? path.join(outputDirectory, "archive") : path.join(outputDirectory, "archive", "page", String(page));
    await mkdir(directory, { recursive: true });
    const depth = page === 1 ? "../" : "../../../";
    const homeLink = page === 1 ? "../" : "../../../";
    const archiveLink = page === 1 ? "./" : "../../";
    const zhHref = "./";
    const enHref = page === 1 ? "../en/archive/" : `../../../../en/archive/page/${page}/`;

    await writeFile(
      path.join(directory, "index.html"),
      shell({
        title: tZh.archiveTitle,
        description: tZh.archiveDesc,
        content: `${header(homeLink, archiveLink, "archive", { locale: "zh", zhHref, enHref })}${archive}`,
        stylesheet: `${depth}styles.css`,
        assetPrefix: depth,
        locale: "zh",
        zhHref,
        enHref,
        alternates: [
          { lang: "zh-CN", href: "./" },
          { lang: "en", href: enHref }
        ]
      })
    );
  }

  // 4b. English Archive
  for (let page = 1; page <= Math.max(1, Math.ceil(allEnPosts.length / pageSize)); page += 1) {
    const slice = allEnPosts.slice((page - 1) * pageSize, page * pageSize);
    const previous = page > 1 ? `<a href="${page === 2 ? "../" : `../${page - 1}/`}">${tEn.newerPosts}</a>` : "";
    const next = page < Math.ceil(allEnPosts.length / pageSize) ? `<a href="${page === 1 ? "page/2/" : `../${page + 1}/`}">${tEn.olderPosts}</a>` : "";
    const pagination = previous || next ? `<p class="archive-link">${previous}${previous && next ? "　" : ""}${next}</p>` : "";
    const archive = `
<main class="page">
  <div class="page-intro-editorial">
    <p class="eyebrow">${tEn.archiveEyebrow(allEnPosts.length)}</p>
    <h1>${tEn.archiveTitle}</h1>
  </div>
  <section class="archive-list">${slice.map((post) => archiveItem(post, "../post/", "en")).join("\n")}</section>
  ${pagination}
</main>`;
    const directory = page === 1 ? path.join(outputDirectory, "en", "archive") : path.join(outputDirectory, "en", "archive", "page", String(page));
    await mkdir(directory, { recursive: true });
    const depth = page === 1 ? "../" : "../../../";
    const homeLink = page === 1 ? "../" : "../../../";
    const archiveLink = page === 1 ? "./" : "../../";
    const zhHref = page === 1 ? "../../archive/" : `../../../../archive/page/${page}/`;
    const enHref = "./";
    const stylesheet = page === 1 ? "../../styles.css" : "../../../../styles.css";
    const assetPrefix = page === 1 ? "../../" : "../../../../";

    await writeFile(
      path.join(directory, "index.html"),
      shell({
        title: tEn.archiveTitle,
        description: tEn.archiveDesc,
        content: `${header(homeLink, archiveLink, "archive", { locale: "en", zhHref, enHref })}${archive}`,
        stylesheet,
        assetPrefix,
        locale: "en",
        zhHref,
        enHref,
        alternates: [
          { lang: "zh-CN", href: zhHref },
          { lang: "en", href: "./" }
        ]
      })
    );
  }

  // 5. Compile and write CSS
  const css = await loadStyles();
  await writeFile(path.join(outputDirectory, "styles.css"), css.trim());
  console.log(`✅ Built ${zhPosts.length} Chinese posts & ${enPosts.length} English posts (${allEnPosts.length} total mapped) → dist/`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  if (process.argv.includes("--watch") || process.argv.includes("-w")) {
    await build();
    console.log("👀 Watching content/ and src/styles/ for changes... Press Ctrl+C to stop.");
    let timeout = null;
    const triggerBuild = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const start = Date.now();
          await build();
          console.log(`⚡ Rebuilt in ${Date.now() - start}ms [${new Date().toLocaleTimeString()}]`);
        } catch (err) {
          console.error("⚠️ Build error:", err.message);
        }
      }, 100);
    };
    try { watch(contentDirectory, { recursive: true }, triggerBuild); } catch (err) { console.error("Watch content failed:", err); }
    try { watch(path.join(root, "src"), { recursive: true }, triggerBuild); } catch (err) { console.error("Watch src failed:", err); }
  } else {
    await build();
  }
}
