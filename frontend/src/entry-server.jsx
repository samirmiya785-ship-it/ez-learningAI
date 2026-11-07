import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App.jsx";
import { resolvePageMeta } from "./pageMeta.js";

const knownRoutes = new Set(["/", "/privacy", "/terms", "/contact", "/home", "/privacy-policy", "/contact-us"]);

export function render(url) {
  const pathname = new URL(url, "http://localhost").pathname;
  const html = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
  return { html, meta: resolvePageMeta(pathname), status: knownRoutes.has(pathname) ? 200 : 404 };
}
