import { NavLink, Outlet } from "react-router";
import { ScanLine, Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { ScanProvider } from "./scan-context";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Live Demo", path: "/demo" },
  { label: "How It Works", path: "/how-it-works" },
  { label: "City View", path: "/city-view" },
  { label: "Analytics", path: "/analytics" },
  { label: "History", path: "/history" },
  { label: "API", path: "/api" },
  { label: "Model Lab", path: "/model-lab" },
  { label: "Ask Chat", path: "/chat" },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ScanProvider>
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        fontFamily: "'Inter', sans-serif",
        background:
          "linear-gradient(180deg, #0b0f0d 0%, #0a0d0b 50%, #080b09 100%)",
        color: "#e4e4e4",
      }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(34,197,94,0.06) 0%, transparent 65%)",
        }}
      />

      {/* Header */}
      <header
        className="w-full sticky top-0 z-50"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10, 14, 12, 0.85)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  boxShadow: "0 0 20px rgba(34, 197, 94, 0.25)",
                }}
              >
                <ScanLine className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span
                  className="leading-tight tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <span style={{ color: "#4ade80" }}>Snap</span>
                  <span className="text-white">Park</span>
                </span>
              </div>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="relative px-3 py-1.5 rounded-lg text-sm transition-all duration-200"
                  style={({ isActive }) => ({
                    color: isActive ? "#4ade80" : "#777",
                    background: isActive
                      ? "rgba(34, 197, 94, 0.1)"
                      : "transparent",
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* AI badge + mobile menu */}
            <div className="flex items-center gap-3">
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                }}
              >
                <Sparkles
                  className="w-3 h-3"
                  style={{ color: "#4ade80" }}
                />
                <span
                  className="text-xs tracking-wide"
                  style={{ color: "#4ade80" }}
                >
                  AI-Powered
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg transition-colors"
                style={{ color: "#888" }}
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div
            className="lg:hidden border-t px-4 py-3"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: "rgba(10, 14, 12, 0.95)",
            }}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm transition-all duration-200"
                  style={({ isActive }) => ({
                    color: isActive ? "#4ade80" : "#777",
                    background: isActive
                      ? "rgba(34, 197, 94, 0.1)"
                      : "transparent",
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="relative flex-1 z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="py-6 text-center border-t z-10 relative"
        style={{ borderColor: "rgba(255,255,255,0.04)" }}
      >
        <p className="text-xs tracking-wide" style={{ color: "#333" }}>
          SnapPark &middot; Intelligent Parking Detection
        </p>
      </footer>
    </div>
    </ScanProvider>
  );
}