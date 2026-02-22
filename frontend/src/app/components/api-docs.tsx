import { useState } from "react";
import { motion } from "motion/react";
import {
  Copy,
  Check,
  Key,
  Terminal,
  Settings,
  Rocket,
  ChevronRight,
  BookOpen,
  Code2,
  Play,
} from "lucide-react";

/* ── Copyable code block ──────────────────────────────────────────── */
function CodeBlock({
  code,
  label,
}: {
  code: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(0,0,0,0.35)" }}
      >
        <span className="text-xs" style={{ color: "#555" }}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs cursor-pointer transition-colors"
          style={{ color: copied ? "#4ade80" : "#555" }}
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="p-4 text-sm overflow-x-auto"
        style={{
          background: "rgba(0,0,0,0.5)",
          color: "#bbb",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.65,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Tutorial steps ───────────────────────────────────────────────── */
const steps = [
  {
    number: "01",
    title: "Get Your API Key",
    subtitle: "Create an account and generate credentials",
    icon: Key,
    prose: `Head to the SnapPark developer portal, create a project, and grab your API key. Store it in an environment variable — never hard-code it.`,
    blocks: [
      {
        label: ".env",
        code: `# .env  (never commit this file)
SNAPPARK_API_KEY=your_api_key_here`,
      },
    ],
    tip: "You can also generate a key from the web dashboard at dashboard.snappark.io/keys.",
  },
  {
    number: "02",
    title: "Install the SDK",
    subtitle: "Add the client library to your project",
    icon: Terminal,
    prose: `Pick whichever package manager and language fits your stack.`,
    blocks: [
      {
        label: "JavaScript / TypeScript",
        code: `# npm
npm install @snappark/sdk

# yarn
yarn add @snappark/sdk

# pnpm
pnpm add @snappark/sdk`,
      },
      {
        label: "Python",
        code: `pip install snappark`,
      },
    ],
    tip: null,
  },
  {
    number: "03",
    title: "Initialize the Client",
    subtitle: "Configure the SDK with your API key",
    icon: Settings,
    prose: `Import the SDK and pass your key. The client handles retries, rate-limit back-off, and request signing automatically.`,
    blocks: [
      {
        label: "TypeScript",
        code: `import { SnapPark } from "@snappark/sdk";

export const snappark = new SnapPark({
  apiKey: process.env.SNAPPARK_API_KEY!,
});`,
      },
      {
        label: "Python",
        code: `import os
from snappark import SnapPark

client = SnapPark(api_key=os.environ["SNAPPARK_API_KEY"])`,
      },
    ],
    tip: null,
  },
  {
    number: "04",
    title: "Make Your First Request",
    subtitle: "Call the API and inspect the response",
    icon: Play,
    prose: `Use the SDK method or hit the endpoint directly with cURL. Every response follows the same { status, data } envelope.`,
    blocks: [
      {
        label: "cURL",
        code: `curl https://api.snappark.io/api/v1/lots \\
  -H "Authorization: Bearer $SNAPPARK_API_KEY"`,
      },
      {
        label: "TypeScript",
        code: `const lots = await snappark.lots.list();

for (const lot of lots.data) {
  console.log(\`\${lot.name} — \${lot.openSpots}/\${lot.totalSpots} open\`);
}`,
      },
      {
        label: "Python",
        code: `lots = client.lots.list()

for lot in lots.data:
    print(f"{lot.name} — {lot.open_spots}/{lot.total_spots} open")`,
      },
    ],
    tip: "Add query params like ?city=atlanta&limit=10 to filter results.",
  },
  {
    number: "05",
    title: "Go to Production",
    subtitle: "Best practices before you ship",
    icon: Rocket,
    prose: `A few things to lock down before going live.`,
    blocks: [
      {
        label: "Production config",
        code: `import { SnapPark } from "@snappark/sdk";

export const snappark = new SnapPark({
  apiKey: process.env.SNAPPARK_API_KEY!,
  retries: 3,          // auto-retry on 5xx / timeouts
  timeout: 30_000,     // 30 second timeout
});`,
      },
      {
        label: "Checklist",
        code: `# 1. Store secrets in env vars — never commit them.
# 2. Handle 429 (rate limit) — the SDK does this automatically.
# 3. Cache frequent queries for 30-60s to stay under limits.
# 4. Use webhooks instead of polling for real-time updates.
# 5. Monitor usage at dashboard.snappark.io/usage.`,
      },
    ],
    tip: "Free tier includes 500 requests/month. Upgrade at dashboard.snappark.io/billing for higher limits.",
  },
];

/* ── Main Component ───────────────────────────────────────────────── */
export function ApiDocs() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* ── Page header ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              boxShadow: "0 0 24px rgba(34,197,94,0.25)",
            }}
          >
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1
            className="text-3xl sm:text-4xl tracking-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Integration Guide
          </h1>
        </div>
        <p style={{ color: "#777" }} className="max-w-2xl leading-relaxed">
          Everything you need to integrate the SnapPark API into your own
          project in five steps.
        </p>
      </motion.div>

      {/* ── Base URL banner ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-10 p-4 rounded-xl flex items-center gap-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Code2
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "#4ade80" }}
        />
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

      {/* ── Steps ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Vertical connector line */}
        <div
          className="absolute left-[19px] top-8 bottom-8 w-px hidden sm:block"
          style={{
            background:
              "linear-gradient(to bottom, rgba(74,222,128,0.3), rgba(74,222,128,0.05))",
          }}
        />

        <div className="flex flex-col gap-14">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
            >
              {/* Step heading */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.25)",
                  }}
                >
                  <step.icon
                    className="w-5 h-5"
                    style={{ color: "#4ade80" }}
                  />
                </div>
                <div>
                  <span
                    className="text-xs tracking-widest"
                    style={{
                      color: "#4ade80",
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                  >
                    STEP {step.number}
                  </span>
                  <h2
                    className="text-xl sm:text-2xl tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {step.title}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: "#666" }}>
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="sm:ml-14">
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: "#999" }}
                >
                  {step.prose}
                </p>

                <div className="flex flex-col gap-4">
                  {step.blocks.map((block) => (
                    <CodeBlock
                      key={block.label}
                      code={block.code}
                      label={block.label}
                    />
                  ))}
                </div>

                {step.tip && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-xl mt-4"
                    style={{
                      background: "rgba(74,222,128,0.04)",
                      border: "1px solid rgba(74,222,128,0.12)",
                    }}
                  >
                    <span
                      style={{ color: "#4ade80" }}
                      className="text-sm mt-px flex-shrink-0"
                    >
                      Tip:
                    </span>
                    <p className="text-sm" style={{ color: "#888" }}>
                      {step.tip}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-16 p-8 rounded-2xl text-center"
        style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <Rocket
          className="w-8 h-8 mx-auto mb-3"
          style={{ color: "#4ade80" }}
        />
        <h3
          className="text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ready to build?
        </h3>
        <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: "#777" }}>
          The API is currently in development. Request early access to start
          integrating SnapPark into your project.
        </p>
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}
        >
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Request Early Access
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
