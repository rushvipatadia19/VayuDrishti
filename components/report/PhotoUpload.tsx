'use client';
import { useState } from 'react';

export function PhotoUpload({ onUpload }: { onUpload: (url: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      // Local fallback / simulate preview for demo without failing
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        setPreview(resultUrl);
        // In local mode without Cloudinary credentials configured, pass null to schema
        onUpload(null);
        setBusy(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload failed');
      setPreview(json.secure_url);
      onUpload(json.secure_url);
    } catch (e) {
      setErr((e as Error).message);
      onUpload(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700" htmlFor="photo-upload">
        Evidence Photo (optional)
      </label>
      <input
        id="photo-upload"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-tint file:text-dark-accent hover:file:bg-green-100 cursor-pointer"
      />
      {busy && <p className="text-xs text-gray-500">Uploading photo...</p>}
      {err && (
        <p className="text-xs text-red-600" role="alert">
          {err} (Report still submits without a photo.)
        </p>
      )}
      {preview && (
        <div className="mt-2 relative inline-block">
          <img
            src={preview}
            alt="Upload preview"
            className="h-28 w-28 rounded-xl object-cover border border-border shadow-sm"
          />
        </div>
      )}
      <p className="text-xs text-gray-400">Supported formats: JPG, PNG, WEBP. Up to 5 MB.</p>
    </div>
  );
}
