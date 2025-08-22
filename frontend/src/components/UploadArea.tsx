import React, { useCallback, useRef, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export type UploadResult = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  url: string;
  uploadedAt: string;
};

type UploadAreaProps = { onUploadSuccess?: () => void };

export default function UploadArea({ onUploadSuccess }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG and PNG files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Max 10MB.';
    }
    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch('/api/v1/uploads', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }
      setResult(data as UploadResult);
      onUploadSuccess?.();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    []
  );

  const openFilePicker = () => inputRef.current?.click();

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={openFilePicker}
        style={{
          border: '2px dashed #888',
          padding: '24px',
          borderRadius: 8,
          cursor: 'pointer',
          background: dragOver ? '#f0f0f0' : 'transparent',
        }}
        aria-label="Upload image by drag-and-drop or click to select"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p><strong>Drag & drop</strong> a manga page here, or click to browse</p>
        <p>Accepted: JPG/PNG up to 10MB</p>
      </div>

      {loading && <p>Uploading...</p>}
      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 16, textAlign: 'left' }}>
          <p>Uploaded successfully!</p>
          <img
            src={result.url}
            alt={result.originalName}
            style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid #ddd' }}
          />
          <ul>
            <li>Filename: {result.filename}</li>
            <li>Type: {result.mimeType}</li>
            <li>Size: {(result.size / 1024).toFixed(1)} KB</li>
            <li>
              Dimensions: {result.width ?? '-'} x {result.height ?? '-'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
