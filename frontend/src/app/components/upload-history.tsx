import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Trash2,
  Eye,
  X,
  MapPin,
  Upload,
  Calendar,
  History,
  Plus,
} from "lucide-react";
import { useScans, type Scan } from "./scan-context";

export function UploadHistory() {
  const { scans, addScan, removeScan } = useScans();
  const [previewScan, setPreviewScan] = useState<Scan | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location prompt state
  const [locationInput, setLocationInput] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<
    { url: string; name: string }[]
  >([]);

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

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFileChange}
      className="hidden"
    />
  );

  // Location prompt modal (shared by empty & filled states)
  const locationModal = (
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
                  e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
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
  );

  // ── Empty state ──────────────────────────────────────────────────
  if (scans.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        {fileInput}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1
            className="text-3xl sm:text-4xl tracking-tight text-white mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Upload History
          </h1>
          <p style={{ color: "#777" }}>
            Your scanned images and results will appear here.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <History className="w-8 h-8" style={{ color: "#333" }} />
          </div>
          <h3
            className="text-white mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No scans yet
          </h3>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: "#555" }}
          >
            Upload one or more parking lot images — they'll be tracked here with
            timestamps, locations, and detection status.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
            }}
          >
            <Upload className="w-4 h-4" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Upload Images
            </span>
          </button>
        </motion.div>

        {locationModal}
      </div>
    );
  }

  // ── Filled state ─────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {fileInput}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1
          className="text-3xl sm:text-4xl tracking-tight text-white mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Upload History
        </h1>
        <p style={{ color: "#777" }}>
          {scans.length} {scans.length === 1 ? "scan" : "scans"} recorded.
        </p>
      </motion.div>

      {/* Summary bar with upload button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-6 p-4 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4" style={{ color: "#4ade80" }} />
          <span className="text-sm" style={{ color: "#888" }}>
            {scans.length} {scans.length === 1 ? "scan" : "scans"} total
            &middot; Most Recent First
          </span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#4ade80",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(34,197,94,0.15)";
            e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(34,197,94,0.1)";
            e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
          }}
        >
          <Plus className="w-3 h-3" />
          Add Images
        </button>
      </motion.div>

      {/* List */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {scans.map((scan, i) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50, height: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl group transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => setPreviewScan(scan)}
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <img
                  src={scan.image}
                  alt={scan.fileName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{scan.fileName}</p>
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

              {/* Status */}
              <div className="hidden sm:block">
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      scan.status === "pending"
                        ? "rgba(250,204,21,0.1)"
                        : "rgba(74,222,128,0.1)",
                    color:
                      scan.status === "pending" ? "#facc15" : "#4ade80",
                    border:
                      scan.status === "pending"
                        ? "1px solid rgba(250,204,21,0.2)"
                        : "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  {scan.status === "pending"
                    ? "Awaiting Detection"
                    : "Processed"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewScan(scan)}
                  className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{ color: "#555" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#4ade80";
                    e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#555";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeScan(scan.id)}
                  className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{ color: "#555" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f87171";
                    e.currentTarget.style.background =
                      "rgba(248,113,113,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#555";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setPreviewScan(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl w-full rounded-2xl overflow-hidden"
              style={{
                background: "#0b0f0d",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
              <img
                src={previewScan.image}
                alt={previewScan.fileName}
                className="w-full h-auto"
              />
              <div className="p-6">
                <h3
                  className="text-white mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {previewScan.fileName}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {previewScan.location &&
                    previewScan.location !== "Unknown Location" && (
                      <div className="flex items-center gap-2">
                        <MapPin
                          className="w-4 h-4"
                          style={{ color: "#4ade80" }}
                        />
                        <span className="text-sm text-white">
                          {previewScan.location}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: "#888" }} />
                    <span className="text-sm" style={{ color: "#888" }}>
                      {previewScan.timestamp}
                    </span>
                  </div>
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {locationModal}
    </div>
  );
}