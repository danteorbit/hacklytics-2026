import { motion } from "motion/react";
import { Check, Info } from "lucide-react";

interface ImageComparisonProps {
  imageUrl: string;
}

export function ImageComparison({ imageUrl }: ImageComparisonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Before Image */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col gap-3"
        >
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
              src={imageUrl}
              alt="Original parking lot"
              className="w-full h-auto object-cover"
            />
            <div
              className="absolute bottom-0 left-0 right-0 p-5"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)",
              }}
            >
              <span className="text-sm tracking-wide" style={{ color: "#999" }}>
                Original Image
              </span>
            </div>
          </div>
        </motion.div>

        {/* After Image */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-3"
        >
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
                "0 8px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(34, 197, 94, 0.06)",
            }}
          >
            <img
              src={imageUrl}
              alt="Parking lot with detected spots"
              className="w-full h-auto object-cover"
            />
            <div
              className="absolute bottom-0 left-0 right-0 p-5"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)",
              }}
            >
              <span className="text-sm tracking-wide" style={{ color: "#4ade80" }}>
                Detected Open Spots
              </span>
            </div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="absolute top-4 right-4 px-3.5 py-2 rounded-xl flex items-center gap-2 text-white"
              style={{
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                boxShadow: "0 4px 16px rgba(34, 197, 94, 0.35)",
              }}
            >
              <Check className="w-4 h-4" />
              <span
                className="text-sm"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Ready
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Info Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="mt-6 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              boxShadow: "0 0 16px rgba(34, 197, 94, 0.2)",
            }}
          >
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <p
              className="text-white"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Image loaded successfully
            </p>
            <p className="text-sm" style={{ color: "#666" }}>
              The "After" image will be processed by your data pipeline to
              highlight open spots.
            </p>
          </div>
        </div>
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
      </motion.div>
    </motion.div>
  );
}