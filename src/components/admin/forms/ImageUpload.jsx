'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ImageUpload({
  label,
  bucket = 'site',
  value, // { bucket, path } or null
  onChange,
  folder = 'home',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (file) => {
    if (!file) return;

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

    setUploading(false);

    if (upErr) {
      setError(upErr.message);
      return;
    }

    onChange?.({ bucket, path });
  };

  return (
    <div className="mb-3">
      {label ? <div className="form-label">{label}</div> : null}

      <input
        type="file"
        className="form-control"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {value?.bucket && value?.path ? (
        <div className="small opacity-75 mt-2">
          Stored: <code>{value.bucket}/{value.path}</code>
        </div>
      ) : null}

      {uploading ? <div className="small opacity-75 mt-2">Uploading...</div> : null}
      {error ? <div className="small text-danger mt-2">{error}</div> : null}
    </div>
  );
}
