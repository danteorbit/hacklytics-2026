import { useState } from "react";
import { motion } from "motion/react";
import {
  Code2,
  Copy,
  Check,
  ArrowRight,
  Braces,
  Image,
  Lock,
  Zap,
} from "lucide-react";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/analyze-image",
    description: "Upload a parking lot image and receive detection results.",
    request: `{
  "image": "<base64_encoded_image>",
  "options": {
    "confidence_threshold": 0.85,
    "return_mask": true,
    "return_coordinates": true
  }
}`,
    response: `{
  "status": "success",
  "data": {
    "total_spots": 120,
    "open_spots": 34,
    "occupied_spots": 86,
    "occupancy_rate": 0.717,
    "detections": [
      {
        "id": "spot_001",
        "status": "open",
        "confidence": 0.96,
        "bbox": [120, 340, 165, 380],
        "center": [142, 360]
      },
      {
        "id": "spot_002",
        "status": "occupied",
        "confidence": 0.94,
        "bbox": [170, 340, 215, 380],
        "center": [192, 360]
      }
    ],
    "processed_image": "<base64_annotated_image>",
    "mask": "<base64_binary_mask>",
    "processing_time_ms": 342
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/lots",
    description: "List all monitored parking lots with current status.",
    request: `// Query parameters:
?city=san_francisco
&status=available
&limit=20
&offset=0`,
    response: `{
  "status": "success",
  "data": {
    "lots": [
      {
        "id": "lot_001",
        "name": "City Center Garage",
        "address": "101 Main St",
        "coordinates": [37.7749, -122.4194],
        "total_spots": 350,
        "open_spots": 124,
        "last_scanned": "2026-02-21T14:23:05Z"
      }
    ],
    "total": 42,
    "page": 1
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/lots/:id/history",
    description: "Get historical occupancy data for a specific lot.",
    request: `// Query parameters:
?from=2026-02-01
&to=2026-02-21
&interval=hourly`,
    response: `{
  "status": "success",
  "data": {
    "lot_id": "lot_001",
    "history": [
      {
        "timestamp": "2026-02-21T08:00:00Z",
        "open_spots": 200,
        "total_spots": 350,
        "occupancy_rate": 0.429
      },
      {
        "timestamp": "2026-02-21T09:00:00Z",
        "open_spots": 145,
        "total_spots": 350,
        "occupancy_rate": 0.586
      }
    ]
  }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/webhooks",
    description:
      "Register a webhook to receive real-time occupancy alerts.",
    request: `{
  "url": "https://your-app.com/webhook",
  "events": ["lot.full", "lot.available"],
  "lot_ids": ["lot_001", "lot_002"],
  "threshold": 0.9
}`,
    response: `{
  "status": "success",
  "data": {
    "webhook_id": "wh_abc123",
    "url": "https://your-app.com/webhook",
    "events": ["lot.full", "lot.available"],
    "created_at": "2026-02-21T14:23:05Z"
  }
}`,
  },
];

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-2 rounded-t-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
        <span className="text-xs" style={{ color: "#555" }}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs cursor-pointer transition-colors"
          style={{ color: copied ? "#4ade80" : "#555" }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="p-4 rounded-b-xl text-sm overflow-x-auto"
        style={{
          background: "rgba(0,0,0,0.4)",
          color: "#aaa",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "#60a5fa",
    POST: "#4ade80",
    PUT: "#facc15",
    DELETE: "#f87171",
  };
  const color = colors[method] || "#888";
  return (
    <span
      className="px-2.5 py-1 rounded-md text-xs tracking-wider"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {method}
    </span>
  );
}

export function ApiDocs() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1
          className="text-3xl sm:text-4xl tracking-tight text-white mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          API Reference
        </h1>
        <p style={{ color: "#777" }} className="max-w-2xl">
          Integrate SnapPark's parking detection into your own applications.
          RESTful endpoints, JSON responses, real-time webhooks.
        </p>
      </motion.div>

      {/* Quick info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
      >
        {[
          {
            icon: Lock,
            title: "Authentication",
            desc: "Bearer token via API key",
          },
          {
            icon: Zap,
            title: "Rate Limit",
            desc: "100 requests / minute",
          },
          {
            icon: Braces,
            title: "Format",
            desc: "JSON request & response",
          },
        ].map((item, i) => (
          <div
            key={item.title}
            className="p-5 rounded-xl flex items-center gap-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
            >
              <item.icon className="w-5 h-5" style={{ color: "#4ade80" }} />
            </div>
            <div>
              <p className="text-sm text-white">{item.title}</p>
              <p className="text-xs" style={{ color: "#666" }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Base URL */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-10 p-4 rounded-xl flex items-center gap-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Code2 className="w-4 h-4 flex-shrink-0" style={{ color: "#4ade80" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Base URL:
        </span>
        <code
          className="text-sm"
          style={{
            color: "#4ade80",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          https://api.snappark.io
        </code>
      </motion.div>

      {/* Endpoints */}
      <div className="flex flex-col gap-8">
        {endpoints.map((ep, i) => (
          <motion.div
            key={ep.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <MethodBadge method={ep.method} />
                <code
                  className="text-sm"
                  style={{
                    color: "#ccc",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  }}
                >
                  {ep.path}
                </code>
              </div>
              <p className="text-sm mb-5" style={{ color: "#888" }}>
                {ep.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CodeBlock code={ep.request} label="Request" />
                <CodeBlock code={ep.response} label="Response" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-10 p-6 rounded-2xl text-center"
        style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <Image className="w-8 h-8 mx-auto mb-3" style={{ color: "#4ade80" }} />
        <h3
          className="text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ready to integrate?
        </h3>
        <p className="text-sm mb-4" style={{ color: "#777" }}>
          The API is currently in development. Request early access to start
          building.
        </p>
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}
        >
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Request API Key
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}