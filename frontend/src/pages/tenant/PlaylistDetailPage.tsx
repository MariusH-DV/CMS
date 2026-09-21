import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { MediaAsset, Playlist, PlaylistItem } from '../../api/types';

type DraftItem = { mediaAssetId: string; durationSeconds: number; mediaAsset: MediaAsset };

export default function PlaylistDetailPage() {
  const { tenantId, playlistId } = useParams<{ tenantId: string; playlistId: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get<Playlist>(`/tenants/${tenantId}/playlists/${playlistId}`).then((res) => {
      setPlaylist(res.data);
      setItems(
        res.data.items.map((i: PlaylistItem) => ({
          mediaAssetId: i.mediaAssetId,
          durationSeconds: i.durationSeconds,
          mediaAsset: i.mediaAsset,
        })),
      );
    });
    apiClient.get<MediaAsset[]>(`/tenants/${tenantId}/media`).then((res) => setMedia(res.data));
  }

  useEffect(load, [tenantId, playlistId]);

  function addItem() {
    const asset = media.find((m) => m.id === selectedMediaId);
    if (!asset) return;
    setItems((prev) => [...prev, { mediaAssetId: asset.id, durationSeconds: 10, mediaAsset: asset }]);
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDuration(index: number, duration: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, durationSeconds: duration } : item)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/tenants/${tenantId}/playlists/${playlistId}/items`, {
        items: items.map((i) => ({ mediaAssetId: i.mediaAssetId, durationSeconds: i.durationSeconds })),
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!playlist) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{playlist.name}</h1>
        <p className="text-sm text-slate-500">Reihenfolge und Anzeigedauer der Medien festlegen.</p>
      </div>

      <div className="card p-5 flex flex-col gap-4">
        <div className="flex gap-2">
          <select className="input" value={selectedMediaId} onChange={(e) => setSelectedMediaId(e.target.value)}>
            <option value="">Medium waehlen...</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fileName}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={addItem} disabled={!selectedMediaId}>
            <i className="fa-solid fa-plus" /> Hinzufuegen
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {items.length === 0 && <div className="text-slate-400 text-sm">Noch keine Eintraege.</div>}
          {items.map((item, index) => (
            <div key={`${item.mediaAssetId}-${index}`} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-slate-400 w-6 text-center">{index + 1}</span>
              <span className="flex-1 truncate text-sm text-slate-700">{item.mediaAsset.fileName}</span>
              <input
                type="number"
                min={1}
                className="input w-24"
                value={item.durationSeconds}
                onChange={(e) => updateDuration(index, Number(e.target.value))}
              />
              <span className="text-xs text-slate-400">Sek.</span>
              <button className="btn-secondary" onClick={() => move(index, -1)} disabled={index === 0}>
                <i className="fa-solid fa-arrow-up" />
              </button>
              <button className="btn-secondary" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                <i className="fa-solid fa-arrow-down" />
              </button>
              <button className="btn-danger" onClick={() => removeAt(index)}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-floppy-disk" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
