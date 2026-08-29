import { watch } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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

export async function build() {
  const pageSize = 50;
  const updateKey = Date.now();
  const { parsePost, paragraphize } = await import(`./src/parser.mjs?t=${updateKey}`);
  const { shell, header, postItem, archiveItem } = await import(`./src/template.mjs?t=${updateKey}`);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, "archive"), { recursive: true });
  await mkdir(path.join(outputDirectory, "post"), { recursive: true });
  await mkdir(path.join(outputDirectory, "assets"), { recursive: true });

  // 1. Copy global assets (content/assets -> dist/assets & dist/)
  try {
    const assetFiles = await readdir(assetsDirectory);
    for (const file of assetFiles) {
      if (file.startsWith(".")) continue;
      const src = path.join(assetsDirectory, file);
      await cp(src, path.join(outputDirectory, "assets", file), { recursive: true });
      await cp(src, path.join(outputDirectory, file), { recursive: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Assets copy warning:", error.message);
  }

  // 2. Scan and parse post bundles from content/
  const entries = await readdir(contentDirectory, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "assets" || entry.name === "media") continue;

    if (entry.isDirectory()) {
      const slug = entry.name;
      const postContentDir = path.join(contentDirectory, slug);
      const postOutputDir = path.join(outputDirectory, "post", slug);
      await mkdir(postOutputDir, { recursive: true });

      const files = await readdir(postContentDir);
      let mdFilename = files.find((f) => f === "index.md") || files.find((f) => f.endsWith(".md"));

      if (!mdFilename) {
        console.warn(`⚠️ No markdown file found in ${slug}/, skipping.`);
        continue;
      }

      // Copy non-markdown media files to dist/post/<slug>/
      for (const file of files) {
        if (file.endsWith(".md") || file.startsWith(".")) continue;
        await cp(path.join(postContentDir, file), path.join(postOutputDir, file), { recursive: true });
      }

      const rawMd = await readFile(path.join(postContentDir, mdFilename), "utf8");
      const post = parsePost(rawMd, path.join(postContentDir, mdFilename), slug);
      posts.push(post);

      // Render post page
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
  <div class="article-body">${paragraphize(post.body, "")}</div>
  <a class="back" href="../../">← 返回文章列表</a>
</main>`;

      await writeFile(
        path.join(postOutputDir, "index.html"),
        shell({
          title: post.title,
          description: post.summary,
          content: `${header("../../", "../../archive/", "article")}${article}`,
          stylesheet: "../../styles.css",
          assetPrefix: "../../"
        })
      );
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // Support loose .md files in content/
      const slug = path.basename(entry.name, ".md");
      const postOutputDir = path.join(outputDirectory, "post", slug);
      await mkdir(postOutputDir, { recursive: true });

      const rawMd = await readFile(path.join(contentDirectory, entry.name), "utf8");
      const post = parsePost(rawMd, entry.name, slug);
      posts.push(post);

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
  <div class="article-body">${paragraphize(post.body, "")}</div>
  <a class="back" href="../../">← 返回文章列表</a>
</main>`;

      await writeFile(
        path.join(postOutputDir, "index.html"),
        shell({
          title: post.title,
          description: post.summary,
          content: `${header("../../", "../../archive/", "article")}${article}`,
          stylesheet: "../../styles.css",
          assetPrefix: "../../"
        })
      );
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));

  // 3. Home page
  const latestPosts = posts.slice(0, 12);
  const introduction = `
<main class="page">
  <div class="page-intro-editorial">
    <h1>Random Shit</h1>
    <p class="intro">一些做过的事、注意到的东西，和还没想清楚的问题。</p>
    <div class="cyber-sys-info">
      <span>LOC: [NET_NODE_0x7F]</span>
      <span>SYS: [NOMINAL]</span>
    </div>
  </div>
  <section class="post-list" aria-label="最新文章">
    ${latestPosts.map((post, i) => postItem(post, "post/", "", i + 1)).join("\n")}
  </section>
  ${posts.length > latestPosts.length ? `<p class="archive-link"><a href="archive/">查看全部 ${posts.length} 篇文章 →</a></p>` : ""}
</main>`;

  await writeFile(
    path.join(outputDirectory, "index.html"),
    shell({
      title: "Random Shit",
      description: "一些做过的事、注意到的东西，和还没想清楚的问题。",
      content: `${header("./", "archive/", "home")}${introduction}`,
      stylesheet: "styles.css",
      assetPrefix: ""
    })
  );

  // 4. Archive pages
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
    await writeFile(
      path.join(directory, "index.html"),
      shell({
        title: "归档",
        description: "Khalil's Random Shit 的所有文章。",
        content: `${header(depth, "./", "archive")}${archive}`,
        stylesheet: `${depth}styles.css`,
        assetPrefix: depth
      })
    );
  }

  // 5. Compile and write CSS
  const css = await loadStyles();
  await writeFile(path.join(outputDirectory, "styles.css"), css.trim());
  console.log(`✅ Built ${posts.length} posts → dist/`);
}

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
