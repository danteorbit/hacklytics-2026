import { motion } from "motion/react";
import {
  Upload,
  Cpu,
  Layers,
  Box,
  Grid3X3,
  ScanLine,
  Eye,
  ArrowDown,
  Zap,
  Brain,
  Target,
} from "lucide-react";

const pipelineSteps = [
  {
    icon: Upload,
    title: "Image Ingestion",
    description:
      "Raw parking lot image (aerial, CCTV, or satellite) is uploaded and preprocessed. Image is resized, normalized, and color-corrected for consistent model input.",
    tags: ["JPEG/PNG", "Resize to 640×640", "Normalization"],
    color: "#60a5fa",
  },
  {
    icon: Layers,
    title: "Image Segmentation",
    description:
      "The image is segmented into regions of interest. Semantic segmentation identifies road surfaces, parking markings, vehicles, and empty areas.",
    tags: ["Semantic Segmentation", "Region Proposals", "Mask Generation"],
    color: "#c084fc",
  },
  {
    icon: Brain,
    title: "Feature Extraction",
    description:
      "A convolutional neural network (CNN) backbone extracts spatial features. Each region is encoded with feature vectors that capture shape, texture, and context.",
    tags: ["CNN Backbone", "Feature Maps", "ResNet / EfficientNet"],
    color: "#f472b6",
  },
  {
    icon: Box,
    title: "Object Detection",
    description:
      "Bounding box detection identifies vehicles in the image. Future integration with YOLO v8 or Faster R-CNN for real-time detection at scale.",
    tags: ["YOLO v8", "Bounding Boxes", "NMS Filtering"],
    color: "#fb923c",
  },
  {
    icon: Grid3X3,
    title: "Pixel Clustering",
    description:
      "K-means or DBSCAN clustering groups pixels by color and spatial proximity. This helps distinguish empty asphalt from vehicle surfaces and shadows.",
    tags: ["K-Means", "DBSCAN", "Color Histograms"],
    color: "#facc15",
  },
  {
    icon: ScanLine,
    title: "Spot Classification",
    description:
      "Each detected region is classified as occupied or empty. A lightweight classifier assigns a confidence score and generates a binary mask.",
    tags: ["Binary Classification", "Confidence Scores", "Mask Overlay"],
    color: "#4ade80",
  },
  {
    icon: Eye,
    title: "Output Generation",
    description:
      "Final annotated image is produced with green bounding boxes on empty spots. Metadata includes spot count, coordinates, and confidence per detection.",
    tags: ["Annotated Image", "JSON Metadata", "Spot Coordinates"],
    color: "#22d3ee",
  },
];

const futureWork = [
  {
    icon: Zap,
    title: "Real-Time Video Feed",
    description:
      "Process live camera streams frame-by-frame for continuous occupancy monitoring.",
  },
  {
    icon: Target,
    title: "YOLO v8 Integration",
    description:
      "Fine-tuned YOLOv8 model trained on 50k+ parking lot images for sub-second detection.",
  },
  {
    icon: Cpu,
    title: "Edge Deployment",
    description:
      "Optimized ONNX models deployed on edge devices (Jetson Nano) for local inference.",
  },
];

export function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <h1
          className="text-3xl sm:text-4xl tracking-tight text-white mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          How It Works
        </h1>
        <p style={{ color: "#777" }} className="max-w-2xl">
          Our image processing pipeline transforms raw parking lot imagery into
          actionable occupancy data. Here's every stage of the detection system.
        </p>
      </motion.div>

      {/* Pipeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-6 top-0 bottom-0 w-px hidden sm:block"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(34,197,94,0.3) 10%, rgba(34,197,94,0.3) 90%, transparent)",
          }}
        />

        <div className="flex flex-col gap-3">
          {pipelineSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative flex gap-5 sm:pl-16"
            >
              {/* Icon node */}
              <div
                className="hidden sm:flex absolute left-0 w-12 h-12 rounded-xl items-center justify-center flex-shrink-0 z-10"
                style={{
                  background: `${step.color}18`,
                  border: `1px solid ${step.color}40`,
                }}
              >
                <step.icon className="w-5 h-5" style={{ color: step.color }} />
              </div>

              {/* Card */}
              <div
                className="flex-1 p-6 rounded-2xl transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="sm:hidden w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${step.color}18`,
                      border: `1px solid ${step.color}40`,
                    }}
                  >
                    <step.icon
                      className="w-4 h-4"
                      style={{ color: step.color }}
                    />
                  </div>
                  <div>
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: step.color }}
                    >
                      Stage {i + 1}
                    </span>
                    <h3
                      className="text-white"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#888" }}>
                  {step.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-xs"
                      style={{
                        background: `${step.color}10`,
                        color: `${step.color}`,
                        border: `1px solid ${step.color}25`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow between steps */}
              {i < pipelineSteps.length - 1 && (
                <div className="hidden sm:flex absolute -bottom-3 left-6 -translate-x-1/2 z-20">
                  <ArrowDown
                    className="w-3.5 h-3.5"
                    style={{ color: "rgba(74, 222, 128, 0.4)" }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Future Work */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-16"
      >
        <h2
          className="text-2xl tracking-tight text-white mb-6"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Roadmap & Future Work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {futureWork.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="p-6 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  boxShadow: "0 0 16px rgba(34, 197, 94, 0.2)",
                }}
              >
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h4
                className="text-white mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {item.title}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "#666" }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}