import { createContext, useContext, useState, useCallback } from "react";

export interface Scan {
  id: string;
  image: string;
  fileName: string;
  location: string;
  timestamp: string;
  status: "pending" | "processed";
  // These will be null until real detection pipeline is wired up
  openSpots: number | null;
  totalSpots: number | null;
  confidence: number | null;
}

interface ScanContextType {
  scans: Scan[];
  addScan: (image: string, fileName: string, location: string) => Scan;
  removeScan: (id: string) => void;
  clearScans: () => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<Scan[]>([]);

  const addScan = useCallback(
    (image: string, fileName: string, location: string): Scan => {
      const now = new Date();
      const timestamp = now.toISOString().replace("T", " ").slice(0, 19);
      const newScan: Scan = {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        image,
        fileName: fileName || "uploaded-image.jpg",
        location: location || "Unknown Location",
        timestamp,
        status: "pending",
        openSpots: null,
        totalSpots: null,
        confidence: null,
      };
      setScans((prev) => [newScan, ...prev]);
      return newScan;
    },
    [],
  );

  const removeScan = useCallback((id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearScans = useCallback(() => {
    setScans([]);
  }, []);

  return (
    <ScanContext.Provider value={{ scans, addScan, removeScan, clearScans }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScans() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScans must be used within ScanProvider");
  return ctx;
}
