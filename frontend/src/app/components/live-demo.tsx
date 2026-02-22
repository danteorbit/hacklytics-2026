import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Info,
  Upload,
  MapPin,
  Image as ImageIcon,
  Eye,
  Clock,
  X,
  Plus,
  Images,
} from "lucide-react";
import { useScans, type Scan } from "./scan-context";
import { useNavigate } from "react-router";

const SAMPLE_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1640675321117-20cf2ebaf9e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXJpYWwlMjBwYXJraW5nJTIwbG90JTIwY2FycyUyMHNhdGVsbGl0ZSUyMHZpZXd8ZW58MXx8fHwxNzcxNjY0ODgyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    label: "Aerial Parking Lot",
  },
  {
    url: "https://images.unsplash.com/photo-1767096684353-a979c6fe02ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJraW5nJTIwZ2FyYWdlJTIwcm9vZnRvcCUyMGNhcnMlMjBvdmVyaGVhZHxlbnwxfHx8fDE3NzE2NjQ4ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    label: "Parking Garage",
  },
  {
    url: "https://images.unsplash.com/photo-1697761221129-fdf528507890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wcGluZyUyMG1hbGwlMjBwYXJraW5nJTIwbG90JTIwYWVyaWFsJTIwZHJvbmV8ZW58MXx8fHwxNzcxNjY0ODgzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    label: "Shopping Mall Lot",
  },
  {
    url: "https://images.unsplash.com/photo-1703743617211-22b35f9978fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwcGFya2luZyUyMGxvdCUyMHVyYmFuJTIwY2Fyc3xlbnwxfHx8fDE3NzE2NjQ4ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    label: "Urban Parking Lot",
  },
];

export function LiveDemo() {
  const { scans, addScan, submitScan } = useScans();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location prompt state — works for both samples and multi-file uploads
  const [locationInput, setLocationInput] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingItems, setPendingItems] = useState<
    { url: string; name: string }[]
  >([]);

  // Before/after modal — store only the ID so we always read the latest scan data
  const [previewScanId, setPreviewScanId] = useState<string | null>(null);
  const previewScan = previewScanId ? scans.find((s) => s.id === previewScanId) ?? null : null;

  // ── Sample click ────────────────────────────────────────────────
  const handleSampleClick = (sample: { url: string; label: string }) => {
    setPendingItems([{ url: sample.url, name: `${sample.label.toLowerCase().replace(/\s+/g, "_")}.jpg` }]);
    setShowLocationPrompt(true);
  };

  // ── Multi-file upload ───────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const items: { url: string; name: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      items.push({ url: URL.createObjectURL(files[i]), name: files[i].name });
    }
    setPendingItems(items);
    setShowLocationPrompt(true);
    e.target.value = "";
  };

  // ── Confirm / Skip location ─────────────────────────────────────
  const handleConfirm = () => {
    if (pendingItems.length === 0) return;
    const loc = locationInput.trim();
    for (const item of pendingItems) {
      const scan = addScan(item.url, item.name, loc);
      // Auto-submit to backend for processing
      submitScan(scan.id);
    }
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingItems([]);
  };

  const handleSkip = () => {
    if (pendingItems.length === 0) return;
    for (const item of pendingItems) {
      const scan = addScan(item.url, item.name, "");
      // Auto-submit to backend for processing
      submitScan(scan.id);
    }
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingItems([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
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
          Live Demo
        </h1>
        <p style={{ color: "#777" }}>
          Try sample images or upload your own — select multiple files at once.
          Every scan is saved to your History and Model Lab.
        </p>
      </motion.div>

      {/* Upload your own (multi-file) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-8 p-6 rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px dashed rgba(34,197,94,0.25)",
          color: "#4ade80",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
          e.currentTarget.style.background = "rgba(34,197,94,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
          e.currentTarget.style.background = "rgba(34,197,94,0.05)";
        }}
      >
        <Upload className="w-5 h-5" />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Upload Your Own Images
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-1"
          style={{
            background: "rgba(74,222,128,0.15)",
            color: "#4ade80",
          }}
        >
          Multi-select
        </span>
      </button>

      {/* Sample images */}
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="w-4 h-4" style={{ color: "#555" }} />
        <span className="text-sm" style={{ color: "#888" }}>
          Or try a sample image
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {SAMPLE_IMAGES.map((sample, i) => (
          <motion.div
            key={sample.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            onClick={() => handleSampleClick(sample)}
            className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
              e.currentTarget.style.boxShadow =
                "0 8px 30px rgba(34, 197, 94, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="relative h-28 sm:h-36 overflow-hidden">
              <img
                src={sample.url}
                alt={sample.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                }}
              />
              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              <h3
                className="text-white text-sm mb-0.5"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {sample.label}
              </h3>
              <p className="text-xs" style={{ color: "#555" }}>
                Click to scan
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Scanned Results Gallery ────────────────────────────────── */}
      {scans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Images className="w-4 h-4" style={{ color: "#4ade80" }} />
              <span className="text-sm" style={{ color: "#888" }}>
                Scanned Images ({scans.length})
              </span>
            </div>
            <button
              onClick={() => navigate("/history")}
              className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200"
              style={{
                color: "#666",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#4ade80";
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#666";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              View Full History &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scans.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                onClick={() => setPreviewScanId(scan.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 30px rgba(34, 197, 94, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={scan.image}
                    alt={scan.fileName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                    }}
                  />
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background:
                          scan.status === "processing"
                            ? "rgba(59,130,246,0.15)"
                            : scan.status === "pending"
                              ? "rgba(250,204,21,0.15)"
                              : scan.status === "error"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(74,222,128,0.15)",
                        color:
                          scan.status === "processing"
                            ? "#3b82f6"
                            : scan.status === "pending"
                              ? "#facc15"
                              : scan.status === "error"
                                ? "#ef4444"
                                : "#4ade80",
                        border:
                          scan.status === "processing"
                            ? "1px solid rgba(59,130,246,0.3)"
                            : scan.status === "pending"
                              ? "1px solid rgba(250,204,21,0.3)"
                              : scan.status === "error"
                                ? "1px solid rgba(239,68,68,0.3)"
                                : "1px solid rgba(74,222,128,0.3)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {scan.status === "processing" ? "Processing..." : scan.status === "pending" ? "Pending" : scan.status === "error" ? "Error" : `${scan.totalSpots ?? 0} Spots | ${scan.openSpots ?? 0} Open`}
                    </span>
                  </div>
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p
                    className="text-sm text-white truncate mb-1"
                    title={scan.fileName}
                  >
                    {scan.fileName}
                  </p>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: "#555" }}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scan.timestamp}
                    </span>
                    {scan.location && scan.location !== "Unknown Location" && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {scan.location}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add more card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: scans.length * 0.04 }}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[220px] transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "rgba(34,197,94,0.03)",
                border: "1px dashed rgba(34,197,94,0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
                e.currentTarget.style.background = "rgba(34,197,94,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                e.currentTarget.style.background = "rgba(34,197,94,0.03)";
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.2)",
                }}
              >
                <Plus className="w-6 h-6" style={{ color: "#4ade80" }} />
              </div>
              <span className="text-sm" style={{ color: "#4ade80" }}>
                Add More Images
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── Location Prompt Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showLocationPrompt && pendingItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
            }}
            onClick={handleSkip}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: "#0f1310",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview thumbnails */}
              <div className="rounded-xl overflow-hidden mb-5">
                {pendingItems.length === 1 ? (
                  <img
                    src={pendingItems[0].url}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-1 h-32">
                    {pendingItems.slice(0, 3).map((f, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <img
                          src={f.url}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                        {i === 2 && pendingItems.length > 3 && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.6)" }}
                          >
                            <span className="text-white text-sm">
                              +{pendingItems.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <h3
                className="text-white mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {pendingItems.length === 1
                  ? "Where is this parking lot?"
                  : `Where are these ${pendingItems.length} parking lots?`}
              </h3>
              <p className="text-sm mb-4" style={{ color: "#666" }}>
                Add a location for your{" "}
                {pendingItems.length === 1 ? "image" : "images"}. Optional — you
                can skip this.
              </p>

              <div className="relative mb-4">
                <MapPin
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#555" }}
                />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Atlanta, GA"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#e4e4e4",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(34, 197, 94, 0.3)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#888",
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer text-white"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    boxShadow: "0 4px 16px rgba(34, 197, 94, 0.25)",
                  }}
                >
                  {pendingItems.length === 1
                    ? "Confirm & Scan"
                    : `Scan ${pendingItems.length} Images`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Before / After Preview Modal ───────────────────────────── */}
      <AnimatePresence>
        {previewScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(12px)",
            }}
            onClick={() => setPreviewScanId(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-5xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              style={{
                background: "#0b0f0d",
                border: "1px solid rgba(255,255,255,0.08)",
                scrollbarWidth: "thin",
                scrollbarColor: "#333 transparent",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setPreviewScanId(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg cursor-pointer"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#888",
                  backdropFilter: "blur(8px)",
                }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <h2
                    className="text-xl sm:text-2xl tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {previewScan.fileName}
                  </h2>
                  {previewScan.location &&
                    previewScan.location !== "Unknown Location" && (
                      <span
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          color: "#4ade80",
                          border: "1px solid rgba(34,197,94,0.2)",
                        }}
                      >
                        <MapPin className="w-3 h-3" />
                        {previewScan.location}
                      </span>
                    )}
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        previewScan.status === "pending"
                          ? "rgba(250,204,21,0.1)"
                          : "rgba(74,222,128,0.1)",
                      color:
                        previewScan.status === "pending"
                          ? "#facc15"
                          : "#4ade80",
                      border:
                        previewScan.status === "pending"
                          ? "1px solid rgba(250,204,21,0.2)"
                          : "1px solid rgba(74,222,128,0.2)",
                    }}
                  >
                    {previewScan.status === "pending"
                      ? "Awaiting Detection"
                      : "Processed"}
                  </span>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Before */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: "#444" }}
                      />
                      <span
                        className="tracking-tight"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: "#888",
                        }}
                      >
                        Before
                      </span>
                    </div>
                    <div
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <img
                        src={previewScan.image}
                        alt="Original"
                        className="w-full h-auto object-cover"
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 p-4"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)",
                        }}
                      >
                        <span
                          className="text-sm tracking-wide"
                          style={{ color: "#999" }}
                        >
                          Original Image
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* After */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: previewScan.resultImage ? "#22c55e" : "#555",
                          boxShadow: previewScan.resultImage ? "0 0 8px rgba(34, 197, 94, 0.5)" : "none",
                        }}
                      />
                      <span
                        className="tracking-tight"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: "#888",
                        }}
                      >
                        After
                      </span>
                    </div>
                    <div
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        border: previewScan.resultImage
                          ? "1px solid rgba(34, 197, 94, 0.2)"
                          : "1px solid rgba(255,255,255,0.08)",
                        boxShadow:
                          "0 8px 40px rgba(0,0,0,0.4), 0 0 40px rgba(34, 197, 94, 0.06)",
                      }}
                    >
                      {previewScan.resultImage ? (
                        <img
                          src={previewScan.resultImage}
                          alt="Detected parking spots"
                          className="w-full h-auto object-cover"
                        />
                      ) : previewScan.status === "processing" ? (
                        <div className="w-full flex items-center justify-center py-20" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#4ade80", borderTopColor: "transparent" }} />
                            <span className="text-sm" style={{ color: "#888" }}>Analyzing parking lot...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center py-20" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <span className="text-sm" style={{ color: "#666" }}>
                            {previewScan.error || "Awaiting analysis"}
                          </span>
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 left-0 right-0 p-4"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)",
                        }}
                      >
                        <span
                          className="text-sm tracking-wide"
                          style={{ color: "#4ade80" }}
                        >
                          {previewScan.resultImage
                            ? `${previewScan.totalSpots ?? 0} Spots | ${previewScan.vehicles ? `${previewScan.vehicles.total} Vehicles (${previewScan.vehicles.car}C ${previewScan.vehicles.truck}T ${previewScan.vehicles.semi}S)` : ""} | ${previewScan.openSpots ?? 0} Open`
                            : "Detected Open Spots"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info bar */}
                <div
                  className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: previewScan.status === "processed"
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(250,204,21,0.1)",
                        border: previewScan.status === "processed"
                          ? "1px solid rgba(34,197,94,0.2)"
                          : "1px solid rgba(250,204,21,0.2)",
                      }}
                    >
                      <Info className="w-5 h-5" style={{ color: previewScan.status === "processed" ? "#4ade80" : "#facc15" }} />
                    </div>
                    <p className="text-sm" style={{ color: "#666" }}>
                      {previewScan.status === "processed"
                        ? `Analysis complete — ${previewScan.totalSpots} spots, ${previewScan.vehicles?.total ?? 0} vehicles detected (${previewScan.vehicles?.car ?? 0} cars, ${previewScan.vehicles?.truck ?? 0} trucks, ${previewScan.vehicles?.semi ?? 0} semis), ${previewScan.openSpots ?? 0} open.`
                        : previewScan.status === "processing"
                          ? "Image is being analyzed by the SnapPark backend..."
                          : previewScan.error
                            ? `Error: ${previewScan.error}`
                            : "Awaiting analysis from the backend."}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-wide"
                    style={{
                      background: previewScan.status === "processed"
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(250,204,21,0.1)",
                      border: previewScan.status === "processed"
                        ? "1px solid rgba(34, 197, 94, 0.25)"
                        : "1px solid rgba(250,204,21,0.25)",
                      color: previewScan.status === "processed" ? "#4ade80" : "#facc15",
                    }}
                  >
                    {previewScan.status === "processed" ? "Complete" : previewScan.status === "processing" ? "Processing..." : "Awaiting Detection"}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
