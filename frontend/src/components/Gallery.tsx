import React, { useEffect, useState } from 'react';

type ImageItem = {
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

type GalleryProps = { refreshKey?: number };

export default function Gallery({ refreshKey }: GalleryProps) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async (attempt = 0) => {
      if (cancelled) return;
      if (attempt === 0) setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/images?limit=50', { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load images');
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        // Network/temporary error: retry with backoff up to 5 attempts
        const isAbort = e?.name === 'AbortError';
        if (!isAbort && attempt < 5) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          setTimeout(() => load(attempt + 1), delay);
          // keep loading=true while retrying
        } else {
          setError(e?.message || 'Failed to load images');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshKey]);

  if (loading) return <p>Loading images…</p>;
  if (error) return <p role="alert" style={{ color: 'red' }}>{error}</p>;

  if (!items.length) return <p>No images uploaded yet.</p>;

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Recent Uploads</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {items.map((img) => (
          <figure key={img.id} style={{ margin: 0 }}>
            <img src={img.url} alt={img.originalName} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
            <figcaption style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {img.originalName} ({(img.size / 1024).toFixed(0)} KB)
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
