import { createContext, useContext, useState, useCallback, useRef } from "react";

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

  // Synchronous lookup map — avoids stale-closure issues when submitScan is
  // called immediately after addScan (before React re-renders).
  const scanMapRef = useRef<Map<string, Scan>>(new Map());

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
    // Store synchronously so submitScan can find it immediately
    scanMapRef.current.set(newScan.id, newScan);
    setScans((prev) => [newScan, ...prev]);
    return newScan;
  }, []);

  const removeScan = useCallback((id: string) => {
    scanMapRef.current.delete(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const submitScan = useCallback(async (id: string) => {
    // Mark as processing (both state and ref)
    setScans((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, status: "processing" as const };
          scanMapRef.current.set(id, updated);
          return updated;
        }
        return s;
      })
    );

    // Look up from the synchronous ref (always has the latest data)
    const scan = scanMapRef.current.get(id);
    if (!scan) {
      console.error("[SnapPark] submitScan: scan not found for id", id);
      return;
    }
    console.log("[SnapPark] submitScan: sending", scan.fileName, "to backend...");

    try {
      // Convert the blob/data URL to a File object
      const response = await fetch(scan.image);
      const blob = await response.blob();
      const file = new File([blob], scan.fileName, { type: blob.type || "image/jpeg" });

      // Upload to the backend
      const formData = new FormData();
      formData.append("image", file);

      const apiResponse = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        // The response might not be JSON (e.g. Render proxy error page)
        let errorMessage = `Server error (${apiResponse.status})`;
        try {
          const err = await apiResponse.json();
          errorMessage = err.error || errorMessage;
        } catch {
          const text = await apiResponse.text().catch(() => "");
          errorMessage = text.slice(0, 200) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await apiResponse.json();
      } catch {
        throw new Error("Invalid response from server — expected JSON");
      }
      console.log("[SnapPark] Backend returned:", result);

      setScans((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const updated = {
              ...s,
              status: "processed" as const,
              resultImage: result.result_image,
              totalSpots: result.total_spots,
              openSpots: result.total_spots,
              error: null,
            };
            scanMapRef.current.set(id, updated);
            return updated;
          }
          return s;
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[SnapPark] submitScan error:", message);
      setScans((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const updated = { ...s, status: "error" as const, error: message };
            scanMapRef.current.set(id, updated);
            return updated;
          }
          return s;
        })
      );
    }
  }, []);

  const submitAllScans = useCallback(async () => {
    // Read from the synchronous ref so we always see every scan
    const pending = Array.from(scanMapRef.current.values()).filter(
      (s) => s.status === "pending"
    );
    console.log(`[SnapPark] submitAllScans: ${pending.length} pending`);
    await Promise.all(pending.map((s) => submitScan(s.id)));
  }, [submitScan]);

  const clearScans = useCallback(() => {
    scanMapRef.current.clear();
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