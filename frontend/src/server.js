import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Render web-service discovery gives just a hostname (e.g. "snappark-api.onrender.com")
// without a scheme. Web services use HTTPS.
let rawBackend = process.env.BACKEND_URL || "http://localhost:5000";
if (rawBackend && !rawBackend.startsWith("http")) {
  rawBackend = `https://${rawBackend}`;
}
const BACKEND_URL = rawBackend;
console.log(`[proxy] BACKEND_URL = ${BACKEND_URL}`);
const DIST = path.join(__dirname, "dist");

// ── Proxy /api requests to the Python backend ────────────────────────────────
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    // Model inference can take 10-30s on free-tier; give it plenty of time
    proxyTimeout: 300_000,
    timeout: 300_000,
    onError: (err, _req, res) => {
      console.error("[proxy] error:", err.message);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
      }
      res.end(JSON.stringify({ error: `Backend unreachable: ${err.message}` }));
    },
  })
);

// ── Serve static assets from the Vite build output ──────────────────────────
app.use(express.static(DIST));

// ── SPA fallback ─────────────────────────────────────────────────────────────
// React Router handles all client-side routes, so every non-file request
// should return index.html and let the browser-side router take over.
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log();
  console.log(`  SnapPark is running at:`);
  console.log();
  console.log(`    Local:   http://localhost:${PORT}`);
  console.log();
  console.log(`  To change the port:  PORT=8080 node server.js`);
  console.log();
});
