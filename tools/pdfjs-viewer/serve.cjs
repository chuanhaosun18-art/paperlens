// 本地静态服务器：为 PDF.js viewer 提供正确的 MIME 类型 + Range 请求支持
// 用法: node serve.cjs [端口]
// 用 .cjs 后缀是必须的：本项目 package.json 里有 "type": "module"，
// 若命名为 .js 会被 Node 当成 ES 模块，导致 require 不可用。
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".bcmap": "application/octet-stream",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".icc": "application/octet-stream"
};

function notFound(res, urlPath) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found: " + urlPath);
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(ROOT, urlPath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err) return notFound(res, urlPath);
      if (stat.isDirectory()) filePath = path.join(filePath, "index.html");

      fs.stat(filePath, (err2, st) => {
        if (err2 || !st.isFile()) return notFound(res, urlPath);

        const type =
          MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        const range = req.headers.range;
        const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());

        if (m) {
          let start = m[1] === "" ? 0 : Number(m[1]);
          let end = m[2] === "" ? st.size - 1 : Number(m[2]);

          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= st.size) {
            res.writeHead(416, { "Content-Range": `bytes */${st.size}` });
            res.end();
            return;
          }
          end = Math.min(end, st.size - 1);
          res.writeHead(206, {
            "Content-Type": type,
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${start}-${end}/${st.size}`,
            "Content-Length": end - start + 1
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }

        res.writeHead(200, {
          "Content-Type": type,
          "Accept-Ranges": "bytes",
          "Content-Length": st.size
        });
        fs.createReadStream(filePath).pipe(res);
      });
    });
  })
  .listen(PORT, () => {
    console.log(`PDF.js viewer 已启动: http://localhost:${PORT}/web/viewer.html`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`端口 ${PORT} 已被占用——服务应该已经在运行了，直接用下面这个地址即可：`);
      console.log(`http://localhost:${PORT}/web/viewer.html`);
    } else {
      console.log("启动失败: " + err.message);
    }
    process.exitCode = 1;
  });
