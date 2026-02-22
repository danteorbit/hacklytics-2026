import { createContext, useContext, useState, useCallback } from "react";

const API_BASE = "/api";

export interface Scan {
  id: string;
  image: string;
  fileName: string;
  location: string;
  timestamp: string;
  status: "pending" | "processing" | "processed" | "error";
  // Populated after backend processes the image
  resultImage: string | null;
  openSpots: number | null;
  totalSpots: number | null;
  confidence: number | null;
  error: string | null;
}

interface ScanContextType {
  scans: Scan[];
  addScan: (image: string, fileName: string, location: string) => Scan;
  removeScan: (id: string) => void;
  submitScan: (id: string) => Promise<void>;
  submitAllScans: () => Promise<void>;
  clearScans: () => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<Scan[]>([]);

  const addScan = useCallback((image: string, fileName: string, location: string): Scan => {
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").slice(0, 19);
    const newScan: Scan = {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      image,
      fileName: fileName || "uploaded-image.jpg",
      location: location || "Unknown Location",
      timestamp,
      status: "pending",
      resultImage: null,
      openSpots: null,
      totalSpots: null,
      confidence: null,
      error: null,
    };
    setScans((prev) => [newScan, ...prev]);
    return newScan;
  }, []);

  const removeScan = useCallback((id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const submitScan = useCallback(async (id: string) => {
    // Mark as processing
    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "processing" as const } : s))
    );

    // Find the scan
    const scan = scans.find((s) => s.id === id);
    if (!scan) return;

    try {
      // Convert the blob URL to a File object
      const response = await fetch(scan.image);
      const blob = await response.blob();
      const file = new File([blob], scan.fileName, { type: blob.type });

      // Upload to the backend
      const formData = new FormData();
      formData.append("image", file);

      const apiResponse = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        const err = await apiResponse.json();
        throw new Error(err.error || "Analysis failed");
      }

      const result = await apiResponse.json();

      setScans((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "processed" as const,
                resultImage: result.result_image,
                totalSpots: result.total_spots,
                openSpots: result.total_spots,
                error: null,
              }
            : s
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setScans((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "error" as const, error: message } : s
        )
      );
    }
  }, [scans]);

  const submitAllScans = useCallback(async () => {
    const pendingScans = scans.filter((s) => s.status === "pending");
    for (const scan of pendingScans) {
      await submitScan(scan.id);
    }
  }, [scans, submitScan]);

  const clearScans = useCallback(() => {
    setScans([]);
  }, []);

  return (
    <ScanContext.Provider value={{ scans, addScan, removeScan, submitScan, submitAllScans, clearScans }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScans() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScans must be used within ScanProvider");
  return ctx;
}