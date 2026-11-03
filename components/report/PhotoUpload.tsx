'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PhotoUploadProps {
  onUploadComplete: (url: string | null) => void;
}

export function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds 10MB limit.');
      return;
    }

    setError(null);
    setSuccess(false);

    // Show temporary local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // If Cloudinary is configured, upload to persist URL
    if (cloudName && uploadPreset) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Cloudinary rejected upload');
        }

        const data = await res.json();
        if (data.secure_url) {
          setSuccess(true);
          onUploadComplete(data.secure_url);
        } else {
          throw new Error('No secure URL returned');
        }
      } catch (err: unknown) {
        setError('Could not upload image to cloud storage. You can continue without the photo.');
        onUploadComplete(null);
      } finally {
        setUploading(false);
      }
    } else {
      // If no cloud credentials, read file as local data URL for immediate hackathon PDF inclusion
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSuccess(true);
        onUploadComplete(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleClear() {
    setPreview(null);
    setSuccess(false);
    setError(null);
    onUploadComplete(null);
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-stone-50 border-2 border-stone-300 border-dashed rounded-lg cursor-pointer hover:bg-stone-100 hover:border-emerald-600">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-2 text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-stone-600 font-medium">
              Click to upload photo evidence <span className="text-stone-400">(PNG, JPG up to 10MB)</span>
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-50 p-2 flex items-center gap-3">
          <img
            src={preview}
            alt="Evidence preview"
            className="w-16 h-16 object-cover rounded border border-stone-300"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-stone-800">
              {uploading ? 'Uploading to cloud...' : success ? 'Evidence image verified' : 'Selected image'}
            </div>
            <div className="text-[11px] text-stone-500 truncate">
              {uploading ? 'Uploading...' : success ? 'Ready for incident audit report' : 'Preparing...'}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
          >
            Remove
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-700 font-medium">{error}</p>
      )}
    </div>
  );
}
