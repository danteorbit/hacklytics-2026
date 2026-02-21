import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "dist");

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
