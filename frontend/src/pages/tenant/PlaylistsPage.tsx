import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Playlist } from '../../api/types';

export default function PlaylistsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    apiClient.get<Playlist[]>(`/tenants/${tenantId}/playlists`).then((res) => setPlaylists(res.data));
  }

  useEffect(load, [tenantId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiClient.post(`/tenants/${tenantId}/playlists`, { name });
    setName('');
    setShowCreate(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Playlist wirklich loeschen?')) return;
    await apiClient.delete(`/tenants/${tenantId}/playlists/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Playlists</h1>
          <p className="text-sm text-slate-500">Stelle Medien in einer Abfolge fuer deine Bildschirme zusammen.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <i className="fa-solid fa-plus" /> Neue Playlist
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 flex gap-4 items-end max-w-md">
          <div className="flex-1">
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">
            Anlegen
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        {playlists.length === 0 && <div className="text-slate-400 col-span-3">Noch keine Playlists.</div>}
        {playlists.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="font-medium text-slate-800 mb-1">
              <i className="fa-solid fa-list-ol text-brand-500 mr-2" />
              {p.name}
            </div>
            <div className="text-sm text-slate-500 mb-3">{p.items.length} Eintraege</div>
            <div className="flex gap-2">
              <Link to={`/tenants/${tenantId}/playlists/${p.id}`} className="btn-secondary">
                Bearbeiten
              </Link>
              <button className="btn-danger" onClick={() => remove(p.id)}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
