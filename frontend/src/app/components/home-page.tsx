import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Sparkles,
  ArrowRight,
  ScanLine,
  Upload,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { ImageComparison } from "./image-comparison";
import { useScans } from "./scan-context";
import { useNavigate } from "react-router";

export function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addScan } = useScans();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPendingFile({ url, name: file.name });
      setShowLocationPrompt(true);
    }
  };

  const handleConfirmUpload = () => {
    if (!pendingFile) return;
    addScan(pendingFile.url, pendingFile.name, locationInput.trim());
    setSelectedImage(pendingFile.url);
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingFile(null);
  };

  const handleSkipLocation = () => {
    if (!pendingFile) return;
    addScan(pendingFile.url, pendingFile.name, "");
    setSelectedImage(pendingFile.url);
    setShowLocationPrompt(false);
    setLocationInput("");
    setPendingFile(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col items-center gap-10">
      {/* Hero */}
      <AnimatePresence mode="wait">
        {!selectedImage && (
          <motion.div
            key="hero"
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
        )}
      </AnimatePresence>

      {/* Upload button */}
      <div className="flex flex-col items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
          {selectedImage ? (
            <RefreshCw className="w-5 h-5 relative z-10" />
          ) : (
            <Upload className="w-5 h-5 relative z-10" />
          )}
          <span
            className="relative z-10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {selectedImage ? "Scan Another Image" : "Select Image"}
          </span>
        </button>
        {!selectedImage && (
          <p className="text-center max-w-sm text-sm" style={{ color: "#555" }}>
            Upload a parking lot photo to get started
          </p>
        )}
      </div>

      {/* Location prompt modal */}
      <AnimatePresence>
        {showLocationPrompt && pendingFile && (
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
              {/* Preview thumbnail */}
              <div className="rounded-xl overflow-hidden mb-5 h-32">
                <img
                  src={pendingFile.url}
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
                Add a location so it shows up on your City View and Analytics.
                Optional — you can skip this.
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
                  Confirm & Scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison */}
      <AnimatePresence mode="wait">
        {selectedImage && (
          <ImageComparison key={selectedImage} imageUrl={selectedImage} />
        )}
      </AnimatePresence>

      {/* How it Works */}
      <AnimatePresence>
        {!selectedImage && (
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
                  title: "Upload Image",
                  description:
                    "Select a photo of any parking lot — aerial, street-level, or security camera.",
                  icon: Camera,
                },
                {
                  step: "2",
                  title: "AI Detection",
                  description:
                    "Our model scans the image to identify which spots are taken and which are open.",
                  icon: Sparkles,
                },
                {
                  step: "3",
                  title: "View Results",
                  description:
                    "Compare before and after — open spots are clearly highlighted on the output.",
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
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
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
