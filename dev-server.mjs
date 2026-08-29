import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { build } from "./build.mjs";

const PORT = 8080;
const root = process.cwd();
const distDir = path.join(root, "dist");
const contentDir = path.join(root, "content");
const srcDir = path.join(root, "src");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime"
};

// 1. Initial build
await build();

// 2. Start zero-cache HTTP server
const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath.endsWith("/")) reqPath += "index.html";

  let filePath = path.join(distDir, reqPath);

  // If path is directory without trailing slash, redirect to /
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    res.writeHead(302, { Location: reqPath + "/" });
    res.end();
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Dev server running with ZERO cache at http://localhost:${PORT}`);
});

// 3. Hot file watching
let debounceTimer = null;
const onFileChange = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const start = Date.now();
      await build();
      console.log(`⚡ [${new Date().toLocaleTimeString()}] Rebuilt in ${Date.now() - start}ms`);
    } catch (err) {
      console.error("❌ Build error:", err.message);
    }
  }, 80);
};

try { fs.watch(contentDir, { recursive: true }, onFileChange); } catch (e) {}
try { fs.watch(srcDir, { recursive: true }, onFileChange); } catch (e) {}
