import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Info,
  Upload,
  MapPin,
  Image as ImageIcon,
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
  const { scans, addScan } = useScans();
  const navigate = useNavigate();
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingSample, setPendingSample] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSampleClick = (sample: { url: string; label: string }) => {
    setPendingSample(sample);
    setShowLocationPrompt(true);
  };

  const handleConfirmSample = () => {
    if (!pendingSample) return;
    const scan = addScan(
      pendingSample.url,
      `${pendingSample.label.toLowerCase().replace(/\s+/g, "_")}.jpg`,
      locationInput.trim(),
    );
    setSelectedScan(scan);
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingSample(null);
  };

  const handleSkipSample = () => {
    if (!pendingSample) return;
    const scan = addScan(
      pendingSample.url,
      `${pendingSample.label.toLowerCase().replace(/\s+/g, "_")}.jpg`,
      "",
    );
    setSelectedScan(scan);
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingSample(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPendingSample({ url, label: file.name });
      setShowLocationPrompt(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
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
          Try a sample image or upload your own. Each scan gets saved to your
          History, City View, and Analytics.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!selectedScan ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Upload your own */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
                Upload Your Own Image
              </span>
            </button>

            {/* Sample images heading */}
            <div className="flex items-center gap-3 mb-6">
              <ImageIcon className="w-4 h-4" style={{ color: "#555" }} />
              <span className="text-sm" style={{ color: "#888" }}>
                Or try a sample image
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SAMPLE_IMAGES.map((sample, i) => (
                <motion.div
                  key={sample.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  onClick={() => handleSampleClick(sample)}
                  className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
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
                  <div className="relative h-48 overflow-hidden">
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
                  </div>
                  <div className="p-5">
                    <h3
                      className="text-white mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {sample.label}
                    </h3>
                    <p className="text-xs" style={{ color: "#555" }}>
                      Click to scan &rarr; adds to your history
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button
              onClick={() => setSelectedScan(null)}
              className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer"
              style={{
                color: "#888",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#4ade80";
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#888";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to samples</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <h2
                className="text-2xl tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {selectedScan.fileName}
              </h2>
              {selectedScan.location &&
                selectedScan.location !== "Unknown Location" && (
                  <span
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      color: "#4ade80",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    <MapPin className="w-3 h-3" />
                    {selectedScan.location}
                  </span>
                )}
            </div>

            {/* Before / After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    src={selectedScan.image}
                    alt="Before"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: "#22c55e",
                      boxShadow: "0 0 8px rgba(34,197,94,0.5)",
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
                    border: "1px solid rgba(34,197,94,0.2)",
                    boxShadow:
                      "0 8px 40px rgba(0,0,0,0.4), 0 0 40px rgba(34,197,94,0.06)",
                  }}
                >
                  <img
                    src={selectedScan.image}
                    alt="After"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(250,204,21,0.1)",
                    border: "1px solid rgba(250,204,21,0.2)",
                  }}
                >
                  <Info className="w-5 h-5" style={{ color: "#facc15" }} />
                </div>
                <div>
                  <p
                    className="text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Awaiting Detection Pipeline
                  </p>
                  <p className="text-sm" style={{ color: "#666" }}>
                    The "After" image and spot counts will populate once the
                    detection model is connected.
                  </p>
                </div>
              </div>
              <span
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-wide"
                style={{
                  background: "rgba(250,204,21,0.1)",
                  border: "1px solid rgba(250,204,21,0.25)",
                  color: "#facc15",
                }}
              >
                Pending
              </span>
            </motion.div>

            {/* Nav hint */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigate("/history")}
                className="px-4 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#888",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
                  e.currentTarget.style.color = "#4ade80";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "#888";
                }}
              >
                View in History &rarr;
              </button>
              {selectedScan.location &&
                selectedScan.location !== "Unknown Location" && (
                  <button
                    onClick={() => navigate("/city-view")}
                    className="px-4 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#888",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
                      e.currentTarget.style.color = "#4ade80";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.06)";
                      e.currentTarget.style.color = "#888";
                    }}
                  >
                    View on City Map &rarr;
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location prompt modal */}
      <AnimatePresence>
        {showLocationPrompt && pendingSample && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
            }}
            onClick={handleSkipSample}
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
              <div className="rounded-xl overflow-hidden mb-5 h-32">
                <img
                  src={pendingSample.url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3
                className="text-white mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Where is this parking lot?
              </h3>
              <p className="text-sm mb-4" style={{ color: "#666" }}>
                Add a location to place it on the City View map.
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
                    if (e.key === "Enter") handleConfirmSample();
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSkipSample}
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
                  onClick={handleConfirmSample}
                  className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer text-white"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    boxShadow: "0 4px 16px rgba(34, 197, 94, 0.25)",
                  }}
                >
                  Confirm & Scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
