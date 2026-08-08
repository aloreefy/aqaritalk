import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

/**
 * Compact "Upload" button that:
 *  1. Opens a file picker (image/*)
 *  2. Requests a presigned URL from /api/storage/uploads/request-url with the admin JWT
 *  3. PUTs the file directly to GCS
 *  4. Calls onUploaded() with the serving URL  (/api/storage + objectPath)
 */
export function AvatarUpload({ onUploaded, disabled }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const token = localStorage.getItem("admin_token");

      // Step 1: request a presigned upload URL
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();

      // Step 2: PUT the file directly to GCS via the presigned URL
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      // objectPath is already like "/objects/uploads/uuid"
      // Serving URL = /api/storage + objectPath
      onUploaded(`/api/storage${objectPath}`);
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading || disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading || disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60 shrink-0 whitespace-nowrap"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? "Uploading…" : "Upload"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
