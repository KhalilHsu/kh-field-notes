import { watch } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePost, paragraphize } from "./src/parser.mjs";
import { shell, header, postItem, archiveItem } from "./src/template.mjs";

const root = process.cwd();
const contentDirectory = path.join(root, "content");
const outputDirectory = path.join(root, "dist");
const stylesDirectory = path.join(root, "src", "styles");

async function loadStyles() {
  const files = ["base.css", "editorial.css", "magazine.css", "cyberdeck.css", "responsive.css"];
  const parts = await Promise.all(files.map((f) => readFile(path.join(stylesDirectory, f), "utf8")));
  return parts.join("\n");
}

export async function build() {
  const pageSize = 50;

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(path.join(outputDirectory, "archive"), { recursive: true });
  await mkdir(path.join(outputDirectory, "post"), { recursive: true });

  // Copy media assets
  try {
    await cp(path.join(contentDirectory, "media"), path.join(outputDirectory, "media"), { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  // Copy favicon files
  for (const file of ["favicon.svg", "favicon.png", "favicon.ico", "apple-touch-icon.png"]) {
    try { await cp(path.join(contentDirectory, file), path.join(outputDirectory, file)); } catch {}
  }

  // Parse posts
  const filenames = (await readdir(contentDirectory)).filter((name) => name.endsWith(".md"));
  const posts = (
    await Promise.all(filenames.map(async (filename) => parsePost(await readFile(path.join(contentDirectory, filename), "utf8"), filename)))
  ).sort((a, b) => b.date.localeCompare(a.date));

  // Home page
  const latestPosts = posts.slice(0, 12);
  const introduction = `
<main class="page">
  <div class="page-intro-editorial">
    <p class="eyebrow">PERSONAL NOTES</p>
    <h1>KH Field Notes</h1>
    <p class="intro">一些做过的事、注意到的东西，和还没想清楚的问题。</p>
  </div>
  <section class="post-list" aria-label="最新文章">
    ${latestPosts.map((post, i) => postItem(post, "post/", "", i + 1)).join("\n")}
  </section>
  ${posts.length > latestPosts.length ? `<p class="archive-link"><a href="archive/">查看全部 ${posts.length} 篇文章 →</a></p>` : ""}
</main>`;

  await writeFile(
    path.join(outputDirectory, "index.html"),
    shell({ title: "KH Field Notes", description: "一些做过的事、注意到的东西，和还没想清楚的问题。", content: `${header("./", "archive/", "home")}${introduction}`, stylesheet: "styles.css", assetPrefix: "" })
  );

  // Archive pages
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
      shell({ title: "归档", description: "KH Field Notes 的所有文章。", content: `${header(depth, "./", "archive")}${archive}`, stylesheet: `${depth}styles.css`, assetPrefix: depth })
    );
  }

  // Post pages
  for (const post of posts) {
    const directory = path.join(outputDirectory, "post", post.slug);
    await mkdir(directory, { recursive: true });
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
  <div class="article-body">${paragraphize(post.body, "../../")}</div>
  <a class="back" href="../../">← 返回文章列表</a>
</main>`;
    await writeFile(
      path.join(directory, "index.html"),
      shell({ title: post.title, description: post.summary, content: `${header("../../", "../../archive/", "article")}${article}`, stylesheet: "../../styles.css", assetPrefix: "../../" })
    );
  }

  // Compile and write CSS
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
