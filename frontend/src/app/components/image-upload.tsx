import { useRef } from "react";
import { Upload, RefreshCw } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  hasImage: boolean;
}

export function ImageUpload({ onImageSelect, hasImage }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelect(url);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl
          cursor-pointer transition-all duration-300
          hover:-translate-y-0.5 active:translate-y-0 overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, #16a34a, #22c55e)",
          boxShadow:
            "0 4px 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 8px 30px rgba(34, 197, 94, 0.4), 0 0 60px rgba(34, 197, 94, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1)";
        }}
      >
        {hasImage ? (
          <RefreshCw className="w-5 h-5 relative z-10" />
        ) : (
          <Upload className="w-5 h-5 relative z-10" />
        )}
        <span
          className="relative z-10"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {hasImage ? "Change Image" : "Select Image"}
        </span>
      </button>
      {!hasImage && (
        <p className="text-center max-w-sm text-sm" style={{ color: "#555" }}>
          Upload a parking lot photo to get started
        </p>
      )}
    </div>
  );
}