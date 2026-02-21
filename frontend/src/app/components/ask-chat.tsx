import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Sparkles, HelpCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How does spot detection work?",
  "What affects detection accuracy?",
  "Why was a shadow detected as a car?",
  "What image types give best results?",
  "How is confidence score calculated?",
  "Can it work with security cameras?",
];

const RESPONSES: Record<string, string> = {
  "how does spot detection work?":
    "SnapPark uses a multi-stage image processing pipeline. First, the image is preprocessed (resized, normalized). Then semantic segmentation identifies regions of interest — road surfaces, parking lines, vehicles, and empty areas. A CNN feature extractor encodes each region, and a binary classifier determines if each spot is occupied or empty. The final output is an annotated image with green bounding boxes on open spots, along with confidence scores for each detection.",

  "what affects detection accuracy?":
    "Several factors affect accuracy:\n\n• **Image quality** — Higher resolution images produce better results. Blurry or low-light images reduce confidence.\n• **Viewing angle** — Aerial/top-down views are ideal. Oblique angles cause occlusion between vehicles.\n• **Shadows & weather** — Shadows can be mistaken for vehicles. Rain reflections on asphalt create false positives.\n• **Lot markings** — Clearly painted lines help the model identify individual spot boundaries.\n• **Vehicle variety** — Unusual vehicles (motorcycles, trucks) may have lower detection rates than standard cars.",

  "why was a shadow detected as a car?":
    "Shadow misclassification is one of the most common failure modes in parking detection. It happens because:\n\n1. **Color similarity** — Dark shadows on asphalt have similar pixel values to dark-colored vehicles.\n2. **Shape patterns** — Long shadows can mimic the rectangular shape of a vehicle when viewed from above.\n3. **Training data bias** — If the training set lacks diverse shadow examples, the model hasn't learned to distinguish them.\n\nWe're addressing this with shadow-augmented training data and a secondary color-histogram check that compares the detected region against known vehicle color distributions.",

  "what image types give best results?":
    "For optimal results, we recommend:\n\n• **Aerial/drone photos** — Top-down views at 50-200ft altitude provide the clearest spot boundaries.\n• **Satellite imagery** — Works well for large lots, though resolution can be limiting.\n• **Security cameras** — Fixed overhead cameras work if the angle is steep enough (>60° from horizontal).\n• **Resolution** — Minimum 640×640px recommended. Higher is better.\n• **Lighting** — Daylight with minimal shadows gives highest confidence scores. The model can handle overcast conditions well.",

  "how is confidence score calculated?":
    "The confidence score represents the model's certainty that a detected region is correctly classified. It's calculated as:\n\n1. **Softmax probability** — The classifier outputs a probability distribution [empty, occupied]. The higher probability becomes the confidence.\n2. **Geometric validation** — Detections that align with expected parking spot dimensions get a bonus.\n3. **Neighborhood consistency** — If surrounding spots agree with the prediction, confidence increases.\n\nScores above 90% are considered high-confidence. Between 70-90% is moderate. Below 70% triggers a review flag.",

  "can it work with security cameras?":
    "Yes, but with some caveats:\n\n• **Angle matters** — Cameras mounted directly overhead work best. Side-mounted cameras at shallow angles will have significant occlusion.\n• **Resolution** — Most modern IP cameras (1080p+) provide sufficient resolution for detection.\n• **Real-time processing** — Security camera feeds can be processed frame-by-frame. Our pipeline handles ~20 FPS on GPU.\n• **Night vision** — IR/night vision cameras work with reduced accuracy (~80% vs ~95% daylight). We're training a specialized low-light model.",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const [key, value] of Object.entries(RESPONSES)) {
    if (lower.includes(key) || key.includes(lower.slice(0, 20))) {
      return value;
    }
  }
  // Fuzzy match keywords
  const keywords = lower.split(/\s+/);
  for (const [key, value] of Object.entries(RESPONSES)) {
    const matchCount = keywords.filter((w) => key.includes(w)).length;
    if (matchCount >= 2) return value;
  }
  return `Great question! While I don't have a specific answer for that yet, here's what I can tell you:\n\nSnapPark's detection system is built on computer vision principles — image segmentation, object detection, and classification. The pipeline processes parking lot imagery to identify open vs. occupied spots with high accuracy.\n\nTry asking about:\n• How spot detection works\n• What affects accuracy\n• Shadow misclassifications\n• Best image types\n• Confidence score calculation\n• Security camera support`;
}

export function AskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(
      () => {
        const response = getResponse(text);
        const botMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response,
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      },
      800 + Math.random() * 700,
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className="max-w-4xl mx-auto px-6 py-10 flex flex-col"
      style={{ minHeight: "calc(100vh - 140px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1
          className="text-3xl sm:text-4xl tracking-tight text-white mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ask Chat
        </h1>
        <p style={{ color: "#777" }}>
          Ask questions about SnapPark's detection system, accuracy, and
          capabilities.
        </p>
      </motion.div>

      {/* Chat area */}
      <div
        className="flex-1 rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: 400,
        }}
      >
        {/* Messages */}
        <div
          className="flex-1 p-6 overflow-y-auto flex flex-col gap-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}
        >
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-10"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  boxShadow: "0 0 30px rgba(34,197,94,0.2)",
                }}
              >
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h3
                className="text-white mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Ask anything about SnapPark
              </h3>
              <p className="text-sm mb-8 max-w-md" style={{ color: "#666" }}>
                I can explain how detection works, what affects accuracy, how
                confidence scores are calculated, and more.
              </p>

              {/* Suggested questions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200"
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
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl"
                  style={{
                    background:
                      msg.role === "user"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(255,255,255,0.03)",
                    border:
                      msg.role === "user"
                        ? "1px solid rgba(34,197,94,0.25)"
                        : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: msg.role === "user" ? "#e4e4e4" : "#bbb" }}
                  >
                    {msg.content}
                  </p>
                </div>
                {msg.role === "user" && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <User className="w-4 h-4" style={{ color: "#888" }} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex gap-1 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#4ade80" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t flex items-center gap-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about detection, accuracy, confidence..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#e4e4e4",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background:
                input.trim() && !isTyping
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : "rgba(255,255,255,0.03)",
              boxShadow:
                input.trim() && !isTyping
                  ? "0 4px 16px rgba(34,197,94,0.3)"
                  : "none",
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <Sparkles className="w-3 h-3" style={{ color: "#333" }} />
        <p className="text-xs" style={{ color: "#333" }}>
          Responses are pre-programmed explanations about the SnapPark system.
        </p>
      </div>
    </div>
  );
}
