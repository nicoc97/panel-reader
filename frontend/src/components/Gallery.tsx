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

export default function Gallery() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/images?limit=50');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load images');
        setItems(data.items || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load images');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
