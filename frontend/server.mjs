import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer as createViteServer, loadEnv } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
Object.assign(process.env, loadEnv(production ? "production" : "development", root, ""));
const port = Number(process.env.FRONTEND_PORT) || 5173;
const apiServer = new URL(process.env.API_SERVER || "http://localhost:3000");
const redirects = new Map([
  ["/home", "/"],
  ["/privacy-policy", "/privacy"],
  ["/contact-us", "/contact"],
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

let vite;
let template;
let render;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function absoluteUrl(req, pathname) {
  if (process.env.SITE_URL) return new URL(pathname, process.env.SITE_URL).href;
  const protocol = req.headers["x-forwarded-proto"]?.split(",")[0] || (req.socket.encrypted ? "https" : "http");
  return new URL(pathname, `${protocol}://${req.headers.host || "localhost:5173"}`).href;
}

function renderRobots(req) {
  return `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl(req, "/sitemap.xml")}\n`;
}

function renderSitemap(req) {
  const origin = process.env.SITE_URL || absoluteUrl(req, "/");
  const pages = ["/", "/privacy", "/terms", "/contact"];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${escapeHtml(new URL(page, origin).href)}</loc></url>`).join("")}</urlset>`;
}

function handleSpecial(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (["GET", "HEAD"].includes(req.method) && redirects.has(pathname)) {
    res.writeHead(301, { Location: redirects.get(pathname) });
    res.end();
    return true;
  }
  if (req.method === "GET" && pathname === "/robots.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(renderRobots(req));
    return true;
  }
  if (req.method === "GET" && pathname === "/sitemap.xml") {
    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(renderSitemap(req));
    return true;
  }
  return false;
}

function proxyApi(req, res) {
  const transport = apiServer.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = transport(
    {
      protocol: apiServer.protocol,
      hostname: apiServer.hostname,
      port: apiServer.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: apiServer.host },
    },
    (response) => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "The API server is unavailable." }));
  });
  req.pipe(upstream);
}

async function serveAsset(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const filename = path.resolve(root, "dist", "client", `.${pathname}`);
  if (!filename.startsWith(path.resolve(root, "dist", "client") + path.sep)) return false;
  try {
    const details = await stat(filename);
    if (!details.isFile()) return false;
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filename)] || "application/octet-stream", "Content-Length": details.size, "Cache-Control": "public, max-age=31536000, immutable" });
    if (req.method === "HEAD") res.end();
    else res.end(await readFile(filename));
    return true;
  } catch {
    return false;
  }
}

function applyPageMetadata(html, meta, canonical) {
  const title = `<title>${escapeHtml(meta.title)}</title>`;
  const description = `<meta name="description" content="${escapeHtml(meta.description)}" />`;
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return html
    .replace(/<title>.*?<\/title>/s, title)
    .replace(/<meta name="description"[^>]*>/, description)
    .replace(/<link rel="canonical"[^>]*>/, canonicalTag);
}

async function renderRequest(req, res) {
  if (req.url.startsWith("/api/")) {
    proxyApi(req, res);
    return;
  }
  if (production && (await serveAsset(req, res))) return;
  try {
    const url = req.url || "/";
    const renderPage = vite ? (await vite.ssrLoadModule("/src/entry-server.jsx")).render : render;
    const rendered = await renderPage(url);
    let html = template;
    if (vite) html = await vite.transformIndexHtml(url, html);
    html = applyPageMetadata(html, rendered.meta, absoluteUrl(req, new URL(url, "http://localhost").pathname)).replace("<!--app-html-->", rendered.html);
    res.writeHead(rendered.status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    if (req.method === "HEAD") res.end();
    else res.end(html);
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(production ? "Internal server error" : error.stack);
  }
}

async function start() {
  if (production) {
    template = await readFile(path.join(root, "dist", "client", "index.html"), "utf8");
    const serverEntry = await import(pathToFileURL(path.join(root, "dist", "server", "entry-server.js")).href);
    render = serverEntry.render;
  } else {
    vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom" });
    template = await readFile(path.join(root, "index.html"), "utf8");
  }

  const server = createHttpServer((req, res) => {
    if (handleSpecial(req, res)) return;
    if (vite) {
      vite.middlewares(req, res, (error) => {
        if (error) {
          vite.ssrFixStacktrace(error);
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(error.stack);
          return;
        }
        void renderRequest(req, res);
      });
    } else {
      void renderRequest(req, res);
    }
  });
  server.listen(port, () => console.log(`ez-learningAI ${production ? "SSR" : "development"} server listening on http://localhost:${port}`));
}

start().catch((error) => {
  console.error("Frontend server failed to start:", error);
  process.exitCode = 1;
});
