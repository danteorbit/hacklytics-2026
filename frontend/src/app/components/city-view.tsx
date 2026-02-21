import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Car, Layers, Upload, CircleDot } from "lucide-react";
import { useScans, type Scan } from "./scan-context";
import { useNavigate } from "react-router";

export function CityView() {
  const { scans } = useScans();
  const navigate = useNavigate();
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  // Only show scans that have a real location
  const locatedScans = scans.filter(
    (s) => s.location && s.location !== "Unknown Location",
  );

  // Group by location
  const locationGroups = locatedScans.reduce<Record<string, Scan[]>>(
    (acc, scan) => {
      const key = scan.location;
      if (!acc[key]) acc[key] = [];
      acc[key].push(scan);
      return acc;
    },
    {},
  );

  const locations = Object.entries(locationGroups);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
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
          City-Wide View
        </h1>
        <p style={{ color: "#777" }}>
          Locations from your scans appear here. Upload images with a location
          to populate this map.
        </p>
      </motion.div>

      {locations.length === 0 ? (
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
            <MapPin className="w-8 h-8" style={{ color: "#333" }} />
          </div>
          <h3
            className="text-white mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No locations yet
          </h3>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: "#555" }}
          >
            When you upload a parking lot image and add a location (e.g.
            "Atlanta, GA"), it will appear here as a pin on your personal city
            map.
          </p>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
            }}
          >
            <Upload className="w-4 h-4" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Upload an Image
            </span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              minHeight: 450,
            }}
          >
            {/* Grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: 0.04 }}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute w-full h-px"
                  style={{
                    top: `${(i + 1) * 10}%`,
                    background: "#fff",
                  }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute h-full w-px"
                  style={{
                    left: `${(i + 1) * 10}%`,
                    background: "#fff",
                  }}
                />
              ))}
            </div>

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Layers className="w-4 h-4" style={{ color: "#444" }} />
              <span
                className="text-xs tracking-wider uppercase"
                style={{ color: "#444" }}
              >
                Your Locations — {locations.length}{" "}
                {locations.length === 1 ? "area" : "areas"}
              </span>
            </div>

            {/* Location pins distributed across the map */}
            {locations.map(([location, locationScans], i) => {
              // Distribute pins across the map using a seeded-ish position
              const seed = location
                .split("")
                .reduce((a, c) => a + c.charCodeAt(0), 0);
              const x = 15 + ((seed * 7 + i * 23) % 70);
              const y = 15 + ((seed * 13 + i * 31) % 65);

              const isSelected =
                selectedScan &&
                locationScans.some((s) => s.id === selectedScan.id);

              return (
                <motion.div
                  key={location}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="absolute cursor-pointer z-10"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => setSelectedScan(locationScans[0])}
                >
                  {/* Pulse */}
                  <motion.div
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [0.4, 0, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#4ade80", filter: "blur(4px)" }}
                  />
                  <div
                    className="relative w-4 h-4 rounded-full border-2 transition-transform duration-200"
                    style={{
                      background: "#4ade80",
                      borderColor: isSelected ? "#fff" : "#4ade80",
                      boxShadow: "0 0 12px rgba(74,222,128,0.5)",
                    }}
                  />

                  {/* Label */}
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(10,14,12,0.9)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p className="text-xs text-white">{location}</p>
                    <p className="text-xs" style={{ color: "#4ade80" }}>
                      {locationScans.length}{" "}
                      {locationScans.length === 1 ? "scan" : "scans"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <h3
              className="text-white mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your Locations
            </h3>

            <div
              className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#333 transparent",
              }}
            >
              {locations.map(([location, locationScans]) => (
                <div key={location}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 mb-1"
                    style={{ color: "#888" }}
                  >
                    <MapPin
                      className="w-3.5 h-3.5"
                      style={{ color: "#4ade80" }}
                    />
                    <span className="text-sm">{location}</span>
                    <span
                      className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(74,222,128,0.1)",
                        color: "#4ade80",
                      }}
                    >
                      {locationScans.length}
                    </span>
                  </div>
                  {locationScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ml-2"
                      style={{
                        background:
                          selectedScan?.id === scan.id
                            ? "rgba(34,197,94,0.08)"
                            : "rgba(255,255,255,0.02)",
                        border:
                          selectedScan?.id === scan.id
                            ? "1px solid rgba(34,197,94,0.25)"
                            : "1px solid rgba(255,255,255,0.04)",
                      }}
                      onClick={() => setSelectedScan(scan)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <img
                          src={scan.image}
                          alt={scan.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">
                          {scan.fileName}
                        </p>
                        <p className="text-xs" style={{ color: "#555" }}>
                          {scan.timestamp.slice(0, 10)}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(250,204,21,0.1)",
                          color: "#facc15",
                        }}
                      >
                        {scan.status === "pending" ? "Pending" : "Processed"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Detail panel */}
            {selectedScan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl mt-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(34,197,94,0.15)",
                }}
              >
                <div className="rounded-xl overflow-hidden mb-3 h-28">
                  <img
                    src={selectedScan.image}
                    alt={selectedScan.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4
                  className="text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {selectedScan.fileName}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: "#555" }}>
                      Location
                    </p>
                    <p className="text-white">{selectedScan.location}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#555" }}>
                      Status
                    </p>
                    <p style={{ color: "#facc15" }}>
                      {selectedScan.status === "pending"
                        ? "Awaiting Detection"
                        : "Processed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#555" }}>
                      Open Spots
                    </p>
                    <p style={{ color: "#888" }}>
                      {selectedScan.openSpots !== null
                        ? selectedScan.openSpots
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#555" }}>
                      Scanned
                    </p>
                    <p className="text-white">
                      {selectedScan.timestamp.slice(0, 10)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
