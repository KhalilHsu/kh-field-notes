# KH Field Notes

一个纯静态的个人博客。文章保存在 `content/` 中，以 Markdown 为唯一内容源；执行构建后会生成可直接部署的 `dist/` 文件夹。

## 写一篇文章

复制任意 `content/*.md` 文件，修改文件名、标题、日期、标签、摘要和正文。文件名会成为文章链接。

需要插入图片时，把图片放进 `content/media/`，并在正文单独一段写：

```md
![图片说明](media/my-app-screen.png)
```

构建时图片会自动复制到发布目录；图片说明会显示在图片下方。

首页文章列表的封面图是必需的。在文章的开头信息中加入：

```md
cover: media/my-app-cover.png
```

封面图独立于正文图片；暂时没有真实图片时，网站会自动使用中性占位封面，保证列表对齐。

## 本地预览

```sh
npm run dev
```

打开 `http://localhost:3000/`。

## 部署

运行 `npm run build`，将 `dist/` 作为发布目录：GitHub Pages 可直接上传该目录；Cloudflare Pages 的构建命令为 `npm run build`，输出目录为 `dist`。
