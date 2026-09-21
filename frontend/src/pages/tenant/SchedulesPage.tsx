import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { Device, Playlist, Schedule } from '../../api/types';

export default function SchedulesPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [playlistId, setPlaylistId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get<Schedule[]>(`/tenants/${tenantId}/schedules`).then((res) => setSchedules(res.data));
    apiClient.get<Playlist[]>(`/tenants/${tenantId}/playlists`).then((res) => setPlaylists(res.data));
    apiClient.get<Device[]>(`/tenants/${tenantId}/devices`).then((res) => setDevices(res.data));
  }

  useEffect(load, [tenantId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/tenants/${tenantId}/schedules`, {
        playlistId,
        deviceId,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        recurrence,
      });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(id: string) {
    if (!confirm('Zeitplan wirklich loeschen?')) return;
    await apiClient.delete(`/tenants/${tenantId}/schedules/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Zeitplaene</h1>
          <p className="text-sm text-slate-500">Lege fest, welche Playlist wann auf welchem Geraet laeuft.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <i className="fa-solid fa-plus" /> Neuer Zeitplan
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 grid grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="label">Geraet</label>
            <select className="input" required value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Waehlen...</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Playlist</label>
            <select className="input" required value={playlistId} onChange={(e) => setPlaylistId(e.target.value)}>
              <option value="">Waehlen...</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Ende (optional)</label>
            <input type="datetime-local" className="input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <div>
            <label className="label">Wiederholung</label>
            <select className="input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="ONCE">Einmalig</option>
              <option value="DAILY">Taeglich</option>
              <option value="WEEKLY">Woechentlich</option>
            </select>
          </div>
          {error && <div className="col-span-2 text-sm text-red-600">{error}</div>}
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">
              Anlegen
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Geraet</th>
              <th>Playlist</th>
              <th>Start</th>
              <th>Ende</th>
              <th>Wiederholung</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  Noch keine Zeitplaene.
                </td>
              </tr>
            )}
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.device?.name}</td>
                <td>{s.playlist?.name}</td>
                <td>{new Date(s.startAt).toLocaleString('de-DE')}</td>
                <td>{s.endAt ? new Date(s.endAt).toLocaleString('de-DE') : '-'}</td>
                <td>{s.recurrence}</td>
                <td className="text-right">
                  <button className="btn-danger" onClick={() => remove(s.id)}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
