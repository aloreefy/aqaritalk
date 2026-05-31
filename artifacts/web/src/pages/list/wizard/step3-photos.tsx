import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronLeft, Camera, ImagePlus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProperty } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import WizardProgress from "./WizardProgress";

interface UploadedImage {
  id: string;
  path: string;
  local?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WizardStep3Photos() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: property } = useGetProperty(id ?? "");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const existingImages = property?.images ?? [];

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setPendingFiles((prev) => [...prev, ...arr]);
    const urls = arr.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...urls]);
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function deleteExisting(imageId: string) {
    const token = localStorage.getItem("aqari_token");
    try {
      await fetch(`/api/properties/${id}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
    } catch {
      /* ignore */
    }
  }

  async function uploadPending() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem("aqari_token");
    const results: UploadedImage[] = [];

    for (const file of pendingFiles) {
      try {
        const base64 = await fileToBase64(file);
        const res = await fetch(`/api/properties/${id}/images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify({ data: base64, filename: file.name }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const img = await res.json() as { id: string; path: string };
        results.push({ id: img.id, path: img.path });
      } catch {
        toast({ title: "فشل رفع الصورة", description: file.name, variant: "destructive" });
      }
    }

    setUploaded((prev) => [...prev, ...results]);
    setPendingFiles([]);
    setPreviewUrls((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
    setUploading(false);
  }

  async function handleNext() {
    if (pendingFiles.length > 0) {
      await uploadPending();
    }
    navigate(`/list/wizard/${id}/review`);
  }

  const totalExisting = existingImages.length + uploaded.length;
  const maxReached = totalExisting >= 20;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/list/wizard/${id}/location`)} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <p className="font-semibold text-sm text-gray-900 flex-1">{t("wizard.photosTitle")}</p>
        <span className="text-xs text-gray-400">{totalExisting + pendingFiles.length}/20</span>
      </div>

      <WizardProgress currentStep={3} />

      <div className="flex-1 p-4 space-y-4 pb-28">
        {!maxReached && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.addPhoto")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Camera size={22} />
                <span className="text-xs">{t("wizard.uploadFromCamera")}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus size={22} />
                <span className="text-xs">{t("wizard.uploadFromGallery")}</span>
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-700">{t("wizard.pendingUpload")} ({pendingFiles.length})</p>
              <button
                type="button"
                onClick={uploadPending}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-primary font-medium"
              >
                <Upload size={14} />
                {uploading ? t("wizard.uploading") : t("wizard.uploadNow")}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(existingImages.length > 0 || uploaded.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t("wizard.uploadedPhotos")} ({existingImages.length + uploaded.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.path} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => deleteExisting(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {uploaded.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.path} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {existingImages.length === 0 && uploaded.length === 0 && pendingFiles.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <ImagePlus size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("wizard.photoHint")}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 safe-pb space-y-2">
        <Button className="w-full gap-2" onClick={handleNext} disabled={uploading}>
          {uploading ? t("wizard.uploading") : t("wizard.nextReview")}
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </Button>
        {existingImages.length === 0 && uploaded.length === 0 && pendingFiles.length === 0 && (
          <button
            type="button"
            onClick={() => navigate(`/list/wizard/${id}/review`)}
            className="w-full text-xs text-gray-400 py-1"
          >
            {t("wizard.skipPhotos")}
          </button>
        )}
      </div>
    </div>
  );
}
