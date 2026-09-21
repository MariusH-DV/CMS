import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { MediaAsset } from '../../api/types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    apiClient.get<MediaAsset[]>(`/tenants/${tenantId}/media`).then((res) => setItems(res.data));
  }

  useEffect(load, [tenantId]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post(`/tenants/${tenantId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function remove(id: string) {
    if (!confirm('Mediendatei wirklich loeschen?')) return;
    await apiClient.delete(`/tenants/${tenantId}/media/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Medien</h1>
          <p className="text-sm text-slate-500">Bilder und Videos fuer deine Playlists.</p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-upload" />}
          Hochladen
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*" />
        </label>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        {items.length === 0 && <div className="text-slate-400 col-span-4">Noch keine Medien hochgeladen.</div>}
        {items.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="aspect-video bg-slate-100 flex items-center justify-center">
              {m.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/tenants/${tenantId}/media/${m.id}/file`}
                  alt={m.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <i className="fa-solid fa-film text-3xl text-slate-400" />
              )}
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-slate-800 truncate" title={m.fileName}>
                {m.fileName}
              </div>
              <div className="text-xs text-slate-400">{formatBytes(m.sizeBytes)}</div>
              <button className="btn-danger mt-2 w-full justify-center" onClick={() => remove(m.id)}>
                <i className="fa-solid fa-trash" /> Loeschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
