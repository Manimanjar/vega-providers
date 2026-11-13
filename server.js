const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3001;
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, "dist");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest.json");

const server = http.createServer((req, res) => {
  // Enable CORS for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, *");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

  if (pathname === "/" || pathname === "/manifest.json") {
    if (fs.existsSync(MANIFEST_PATH)) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      fs.createReadStream(MANIFEST_PATH).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "manifest.json not found" }));
    }
    return;
  }

  // Handle files under /dist/
  if (pathname.startsWith("/dist/")) {
    const relativePath = pathname.replace(/^\/dist\//, "");
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const targetFilePath = path.join(DIST_DIR, safePath);

    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      fs.createReadStream(targetFilePath).pipe(res);
      return;
    }
  }

  // Direct file check under root
  const directPath = path.join(ROOT_DIR, pathname.replace(/^\//, ""));
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    fs.createReadStream(directPath).pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found", path: pathname }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Vega Provider Server is running!`);
  console.log(`📡 Local: http://127.0.0.1:${PORT}`);
  console.log(`📋 Manifest: http://127.0.0.1:${PORT}/manifest.json\n`);
});
