import { motion } from "motion/react";
import {
  Brain,
  Database,
  Target,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { useScans } from "./scan-context";
import { useNavigate } from "react-router";

export function AdminPage() {
  const { scans } = useScans();
  const navigate = useNavigate();

  const totalImages = scans.length;
  const pendingCount = scans.filter((s) => s.status === "pending").length;
  const processedCount = scans.filter((s) => s.status === "processed").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <h1
            className="text-3xl sm:text-4xl tracking-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Model Lab
          </h1>
          <span
            className="px-2.5 py-1 rounded-full text-xs"
            style={{
              background: "rgba(250,204,21,0.1)",
              color: "#facc15",
              border: "1px solid rgba(250,204,21,0.2)",
            }}
          >
            Internal
          </span>
        </div>
        <p style={{ color: "#777" }}>
          Model performance metrics and dataset overview. Stats reflect your
          actual uploads.
        </p>
      </motion.div>

      {/* Live dataset stats from user uploads */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Images Uploaded",
            value: totalImages.toString(),
            icon: Database,
            color: "#60a5fa",
          },
          {
            label: "Pending Detection",
            value: pendingCount.toString(),
            icon: Clock,
            color: "#facc15",
          },
          {
            label: "Processed",
            value: processedCount.toString(),
            icon: Target,
            color: "#4ade80",
          },
          {
            label: "Model Status",
            value: "Not Connected",
            icon: Brain,
            color: "#f87171",
            small: true,
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <kpi.icon className="w-5 h-5 mb-3" style={{ color: kpi.color }} />
            <p
              className={`text-white mb-1 ${kpi.small ? "text-sm" : "text-2xl"}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {kpi.value}
            </p>
            <p className="text-xs" style={{ color: "#555" }}>
              {kpi.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Model not connected notice */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl mb-8 flex items-start gap-4"
        style={{
          background: "rgba(250,204,21,0.04)",
          border: "1px solid rgba(250,204,21,0.15)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(250,204,21,0.1)",
          }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: "#facc15" }} />
        </div>
        <div>
          <h3
            className="text-white mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Detection Model Not Connected
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "#888" }}>
            The following metrics will populate once the detection pipeline
            (YOLO v8 / CNN) is integrated. For now, all uploaded images are
            queued with "Pending" status. Once connected, you'll see:
          </p>
          <ul
            className="text-sm mt-3 flex flex-col gap-1.5"
            style={{ color: "#888" }}
          >
            <li className="flex items-center gap-2">
              <span style={{ color: "#facc15" }}>&#x2022;</span> Model Accuracy,
              Precision, Recall & F1 Score
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: "#facc15" }}>&#x2022;</span> Training curve
              (loss & accuracy over epochs)
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: "#facc15" }}>&#x2022;</span> Confusion matrix with real detection results
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: "#facc15" }}>&#x2022;</span> Sample
              misclassifications from your images
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: "#facc15" }}>&#x2022;</span> Dataset class
              distribution from processed scans
            </li>
          </ul>
        </div>
      </motion.div>

      {/* System Info — static, describes the planned architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h4
            className="text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Planned Architecture
          </h4>
          {[
            {
              icon: Brain,
              label: "Architecture",
              value: "YOLOv8-nano (planned)",
            },
            { icon: Cpu, label: "Training GPU", value: "NVIDIA A100 (planned)" },
            {
              icon: HardDrive,
              label: "Model Size",
              value: "~6 MB (estimated)",
            },
            {
              icon: Clock,
              label: "Target Inference",
              value: "< 50ms per image",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5" style={{ color: "#555" }} />
                <span className="text-sm" style={{ color: "#888" }}>
                  {item.label}
                </span>
              </div>
              <span className="text-sm text-white">{item.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Placeholder metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h4
            className="text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Accuracy", value: "—" },
              { label: "Precision", value: "—" },
              { label: "Recall", value: "—" },
              { label: "F1 Score", value: "—" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="p-4 rounded-xl text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-2xl text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {metric.value}
                </p>
                <p className="text-xs" style={{ color: "#555" }}>
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: "#444" }}>
            Connect the detection model to see real metrics
          </p>
        </motion.div>
      </div>

      {/* Your uploaded images as "dataset" */}
      {totalImages > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h3
            className="text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Your Dataset ({totalImages} {totalImages === 1 ? "image" : "images"})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="h-24 overflow-hidden">
                  <img
                    src={scan.image}
                    alt={scan.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p
                    className="text-xs text-white truncate"
                    title={scan.fileName}
                  >
                    {scan.fileName}
                  </p>
                  <p className="text-xs" style={{ color: "#555" }}>
                    {scan.status === "pending" ? "Unlabeled" : "Labeled"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {totalImages === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-center py-12"
        >
          <p className="text-sm mb-4" style={{ color: "#555" }}>
            No images in your dataset yet. Upload images to build your training
            set.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
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
      )}
    </div>
  );
}
