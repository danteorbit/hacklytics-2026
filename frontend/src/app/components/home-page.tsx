import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Sparkles,
  ArrowRight,
  ScanLine,
  Upload,
  MapPin,
  X,
  Eye,
  Clock,
  Images,
  Plus,
  Trash2,
  Send,
} from "lucide-react";
import { useScans, type Scan } from "./scan-context";
import { useNavigate } from "react-router";

export function HomePage() {
  const [locationInput, setLocationInput] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<
    { url: string; name: string }[]
  >([]);
  const [previewScan, setPreviewScan] = useState<Scan | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { scans, addScan, removeScan, submitScan, submitAllScans } = useScans();
  const navigate = useNavigate();

  const hasScans = scans.length > 0;
  const pendingCount = scans.filter((s) => s.status === "pending").length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pending: { url: string; name: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      pending.push({ url: URL.createObjectURL(files[i]), name: files[i].name });
    }
    setPendingFiles(pending);
    setShowLocationPrompt(true);
    e.target.value = "";
  };

  const handleConfirmUpload = () => {
    if (pendingFiles.length === 0) return;
    const loc = locationInput.trim();
    for (const f of pendingFiles) {
      addScan(f.url, f.name, loc);
    }
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingFiles([]);
  };

  const handleSkipLocation = () => {
    if (pendingFiles.length === 0) return;
    for (const f of pendingFiles) {
      addScan(f.url, f.name, "");
    }
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingFiles([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col items-center gap-10">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!hasScans ? (
          <motion.div
            key="hero-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center flex flex-col items-center gap-4 mt-10"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-2"
              style={{
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                boxShadow:
                  "0 0 50px rgba(34, 197, 94, 0.25), 0 0 100px rgba(34, 197, 94, 0.08)",
              }}
            >
              <ScanLine className="w-12 h-12 text-white" />
            </motion.div>
            <h1
              className="text-4xl sm:text-5xl tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span style={{ color: "#4ade80" }}>Snap</span>
              <span className="text-white">Park</span>
            </h1>
            <p
              className="max-w-md text-center leading-relaxed"
              style={{ color: "#777" }}
            >
              Snap a photo of any parking lot — we'll instantly detect and
              highlight every open spot for you.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="hero-compact"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center flex flex-col items-center gap-2 mt-2"
          >
            <h1
              className="text-3xl sm:text-4xl tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span style={{ color: "#4ade80" }}>Snap</span>
              <span className="text-white">Park</span>
            </h1>
            <p className="text-sm" style={{ color: "#666" }}>
              {scans.length} {scans.length === 1 ? "image" : "images"} uploaded
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload button ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            boxShadow:
              "0 4px 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              "0 8px 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow =
              "0 4px 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1)";
          }}
        >
          {hasScans ? (
            <Plus className="w-5 h-5 relative z-10" />
          ) : (
            <Upload className="w-5 h-5 relative z-10" />
          )}
          <span
            className="relative z-10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {hasScans ? "Add Images" : "Upload Your Images"}
          </span>
        </button>

        {!hasScans && (
          <p className="text-center max-w-sm text-sm" style={{ color: "#555" }}>
            Upload photos to get started
          </p>
        )}
      </div>

      {/* ── Location prompt modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showLocationPrompt && pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
            }}
            onClick={handleSkipLocation}
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
                {pendingFiles.length === 1 ? (
                  <img
                    src={pendingFiles[0].url}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-1 h-32">
                    {pendingFiles.slice(0, 3).map((f, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <img
                          src={f.url}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                        {i === 2 && pendingFiles.length > 3 && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.6)" }}
                          >
                            <span className="text-white text-sm">
                              +{pendingFiles.length - 3}
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
                {pendingFiles.length === 1
                  ? "Where is this parking lot?"
                  : `Where are these ${pendingFiles.length} parking lots?`}
              </h3>
              <p className="text-sm mb-4" style={{ color: "#666" }}>
                Add a location for your{" "}
                {pendingFiles.length === 1 ? "image" : "images"}. Optional — you
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
                    if (e.key === "Enter") handleConfirmUpload();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipLocation}
                  className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#888",
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirmUpload}
                  className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer transition-all duration-200 text-white"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    boxShadow: "0 4px 16px rgba(34, 197, 94, 0.25)",
                  }}
                >
                  {pendingFiles.length === 1
                    ? "Confirm & Scan"
                    : `Scan ${pendingFiles.length} Images`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image Grid ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasScans && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-5xl"
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Images className="w-4 h-4" style={{ color: "#4ade80" }} />
                <span className="text-sm" style={{ color: "#888" }}>
                  Your Uploads
                </span>
                <span className="text-xs" style={{ color: "#555" }}>
                  {scans.length} {scans.length === 1 ? "image" : "images"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <button
                    onClick={submitAllScans}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 text-white"
                    style={{
                      background: "linear-gradient(135deg, #16a34a, #22c55e)",
                      boxShadow: "0 2px 12px rgba(34, 197, 94, 0.25)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 18px rgba(34, 197, 94, 0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(34, 197, 94, 0.25)";
                    }}
                  >
                    <Send className="w-3 h-3" />
                    Submit All ({pendingCount})
                  </button>
                )}
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
            </div>

            {/* Scrollable gallery grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {scans.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(34, 197, 94, 0.3)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 30px rgba(34, 197, 94, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                    onClick={() => setPreviewScan(scan)}
                  >
                    <img
                      src={scan.image}
                      alt={scan.fileName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
                      }}
                    />

                    {/* Slot number */}
                    <div
                      className="absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(8px)",
                        color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.2)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            scan.status === "pending"
                              ? "rgba(250,204,21,0.15)"
                              : "rgba(74,222,128,0.15)",
                          color:
                            scan.status === "pending" ? "#facc15" : "#4ade80",
                          border:
                            scan.status === "pending"
                              ? "1px solid rgba(250,204,21,0.3)"
                              : "1px solid rgba(74,222,128,0.3)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {scan.status === "pending" ? "Pending" : "Processed"}
                      </span>
                    </div>

                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "rgba(0,0,0,0.35)" }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          backdropFilter: "blur(8px)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewScan(scan);
                        }}
                      >
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      {scan.status === "pending" && (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
                          style={{
                            background: "rgba(34,197,94,0.25)",
                            backdropFilter: "blur(8px)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            submitScan(scan.id);
                          }}
                          title="Submit for detection"
                        >
                          <Send className="w-5 h-5" style={{ color: "#4ade80" }} />
                        </div>
                      )}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
                        style={{
                          background: "rgba(248,113,113,0.2)",
                          backdropFilter: "blur(8px)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeScan(scan.id);
                          if (previewScan?.id === scan.id) setPreviewScan(null);
                        }}
                      >
                        <Trash2 className="w-5 h-5" style={{ color: "#f87171" }} />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5">
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
                        {scan.timestamp.slice(11, 16) || scan.timestamp}
                      </span>
                      {scan.location && scan.location !== "Unknown Location" && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {scan.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
            onClick={() => setPreviewScan(null)}
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
                onClick={() => setPreviewScan(null)}
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
                          background: "#22c55e",
                          boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
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
                        border: "1px solid rgba(34, 197, 94, 0.2)",
                        boxShadow:
                          "0 8px 40px rgba(0,0,0,0.4), 0 0 40px rgba(34, 197, 94, 0.06)",
                      }}
                    >
                      <img
                        src={previewScan.image}
                        alt="Detected"
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
                          style={{ color: "#4ade80" }}
                        >
                          Detected Open Spots
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
                  <p className="text-sm" style={{ color: "#666" }}>
                    The "After" image will be processed by your data pipeline to
                    highlight open spots.
                  </p>
                  <span
                    className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-wide"
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                      color: "#4ade80",
                    }}
                  >
                    Awaiting Detection
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── How it Works — empty state only ─────────────────────────── */}
      <AnimatePresence>
        {!hasScans && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="w-full max-w-4xl mt-2"
          >
            <div className="flex items-center justify-center gap-3 mb-10">
              <div
                className="h-px w-12"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.1))",
                }}
              />
              <h3
                className="tracking-tight"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#999",
                }}
              >
                How It Works
              </h3>
              <div
                className="h-px w-12"
                style={{
                  background:
                    "linear-gradient(to left, transparent, rgba(255,255,255,0.1))",
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  step: "1",
                  title: "Upload Images",
                  description:
                    "Select photos of any parking lot — aerial, street-level, or security camera.",
                  icon: Camera,
                },
                {
                  step: "2",
                  title: "AI Detection",
                  description:
                    "Our model scans each image to identify which spots are taken and which are open.",
                  icon: Sparkles,
                },
                {
                  step: "3",
                  title: "View Results",
                  description:
                    "Compare before and after — open spots are clearly highlighted on every output.",
                  icon: ArrowRight,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="group relative flex flex-col items-center text-center p-7 rounded-2xl cursor-default transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(34, 197, 94, 0.3)";
                    e.currentTarget.style.background =
                      "rgba(34, 197, 94, 0.04)";
                    e.currentTarget.style.boxShadow =
                      "0 0 30px rgba(34, 197, 94, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.02)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, #16a34a, #22c55e)",
                      boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className="text-xs tracking-widest uppercase mb-2"
                    style={{ color: "#4ade80" }}
                  >
                    Step {item.step}
                  </span>
                  <h4
                    className="mb-2 text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {item.title}
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#666" }}
                  >
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}