import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ScanLine, MapPin, Clock, Upload, BarChart3 } from "lucide-react";
import { useScans } from "./scan-context";
import { useNavigate } from "react-router";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          background: "rgba(10,14,12,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p
          className="text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {label}
        </p>
        <p style={{ color: "#4ade80" }}>
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function AnalyticsDashboard() {
  const { scans } = useScans();
  const navigate = useNavigate();

  const totalScans = scans.length;
  const locatedScans = scans.filter(
    (s) => s.location && s.location !== "Unknown Location",
  );
  const uniqueLocations = new Set(locatedScans.map((s) => s.location)).size;
  const pendingScans = scans.filter((s) => s.status === "pending").length;
  const processedScans = scans.filter((s) => s.status === "processed").length;

  // Scans per location (for bar chart)
  const locationCounts: Record<string, number> = {};
  scans.forEach((s) => {
    const loc =
      s.location && s.location !== "Unknown Location"
        ? s.location
        : "No Location";
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const locationChartData = Object.entries(locationCounts).map(
    ([name, count]) => ({
      name,
      count,
    }),
  );

  // Status pie
  const statusData = [
    { name: "Pending", value: pendingScans, color: "#facc15" },
    { name: "Processed", value: processedScans, color: "#4ade80" },
  ].filter((d) => d.value > 0);

  // Scans per day
  const dayCounts: Record<string, number> = {};
  scans.forEach((s) => {
    const day = s.timestamp.slice(0, 10);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const dayChartData = Object.entries(dayCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Most recent scan
  const latestScan = scans.length > 0 ? scans[0] : null;

  if (totalScans === 0) {
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
            Analytics Dashboard
          </h1>
          <p style={{ color: "#777" }}>
            Your scanning statistics and trends will appear here.
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
            <BarChart3 className="w-8 h-8" style={{ color: "#333" }} />
          </div>
          <h3
            className="text-white mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No data yet
          </h3>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: "#555" }}
          >
            Upload parking lot images to see your scan volume, location
            breakdown, and detection stats here.
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
      </div>
    );
  }

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
          Analytics Dashboard
        </h1>
        <p style={{ color: "#777" }}>
          Statistics from your {totalScans}{" "}
          {totalScans === 1 ? "scan" : "scans"}.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Scans",
            value: totalScans.toString(),
            icon: ScanLine,
          },
          {
            label: "Unique Locations",
            value: uniqueLocations.toString(),
            icon: MapPin,
          },
          {
            label: "Pending Detection",
            value: pendingScans.toString(),
            icon: Clock,
          },
          {
            label: "Latest Scan",
            value: latestScan ? latestScan.timestamp.slice(11, 16) : "—",
            icon: Clock,
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
            <kpi.icon className="w-5 h-5 mb-3" style={{ color: "#4ade80" }} />
            <p
              className="text-2xl text-white mb-1"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Scans by Location */}
        {locationChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3
              className="text-white mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Scans by Location
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={locationChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#555", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Scans"
                  fill="#4ade80"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Scans by Date */}
        {dayChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3
              className="text-white mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Scans per Day
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#555", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Scans"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Status + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status pie */}
        {statusData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3
              className="text-white mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Scan Status
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-xs" style={{ color: "#777" }}>
                    {d.name} ({d.value})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent scans */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="p-5 rounded-2xl lg:col-span-2"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h4
            className="text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Recent Scans
          </h4>
          <div className="flex flex-col gap-2">
            {scans.slice(0, 8).map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.01)" }}
              >
                <div
                  className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <img
                    src={scan.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{scan.fileName}</p>
                </div>
                <span className="text-xs" style={{ color: "#555" }}>
                  {scan.location !== "Unknown Location" ? scan.location : "—"}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      scan.status === "pending"
                        ? "rgba(250,204,21,0.1)"
                        : "rgba(74,222,128,0.1)",
                    color: scan.status === "pending" ? "#facc15" : "#4ade80",
                  }}
                >
                  {scan.status === "pending" ? "Pending" : "Done"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
