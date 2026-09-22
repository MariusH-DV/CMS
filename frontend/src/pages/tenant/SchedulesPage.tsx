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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [playlistId, setPlaylistId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get<Schedule[]>(`/tenants/${tenantId}/schedules`).then((res) => setSchedules(res.data));
    apiClient.get<Playlist[]>(`/tenants/${tenantId}/playlists`).then((res) => setPlaylists(res.data));
    apiClient.get<Device[]>(`/tenants/${tenantId}/devices`).then((res) => setDevices(res.data));
  }

  useEffect(load, [tenantId]);

  function resetForm() {
    setDeviceIds([]);
    setPlaylistId('');
    setStartAt('');
    setEndAt('');
    setRecurrence('ONCE');
    setError(null);
  }

  function openCreate() {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  }

  function toLocalInputValue(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEdit(s: Schedule) {
    setEditingId(s.id);
    setDeviceIds(s.deviceId ? [s.deviceId] : []);
    setPlaylistId(s.playlistId);
    setStartAt(toLocalInputValue(s.startAt));
    setEndAt(s.endAt ? toLocalInputValue(s.endAt) : '');
    setRecurrence(s.recurrence);
    setError(null);
    setShowCreate(true);
  }

  function toggleDevice(id: string) {
    setDeviceIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      playlistId,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      recurrence,
    };
    try {
      if (editingId) {
        await apiClient.patch(`/tenants/${tenantId}/schedules/${editingId}`, payload);
      } else {
        // Ein Zeitplan gehoert genau zu einem Geraet - bei Mehrfachauswahl
        // legen wir fuer jedes ausgewaehlte Geraet einen eigenen Eintrag an.
        await Promise.all(
          deviceIds.map((deviceId) => apiClient.post(`/tenants/${tenantId}/schedules`, { ...payload, deviceId })),
        );
      }
      setShowCreate(false);
      setEditingId(null);
      resetForm();
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
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
        <button
          className="btn-primary"
          onClick={() => {
            if (showCreate) {
              setShowCreate(false);
            } else {
              openCreate();
            }
          }}
        >
          <i className="fa-solid fa-plus" /> Neuer Zeitplan
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-2 gap-4 max-w-2xl animate-pop-in">
          <div className="col-span-2">
            <label className="label">{editingId ? 'Geraet' : 'Geraete (Mehrfachauswahl moeglich)'}</label>
            {editingId ? (
              <div className="input bg-slate-50 text-slate-500">
                {devices.find((d) => d.id === deviceIds[0])?.name ?? 'Unbekanntes Geraet'}
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto rounded-xl border border-white/70 bg-white/40 p-2">
                {devices.length === 0 && <div className="text-sm text-slate-400 px-2 py-1">Keine Geraete vorhanden.</div>}
                {devices.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/60 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={deviceIds.includes(d.id)}
                      onChange={() => toggleDevice(d.id)}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            )}
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
            <label className="label">Wiederholung</label>
            <select className="input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="ONCE">Einmalig</option>
              <option value="DAILY">Taeglich</option>
              <option value="WEEKLY">Woechentlich</option>
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
          {error && <div className="col-span-2 text-sm text-red-600">{error}</div>}
          <div className="col-span-2 flex gap-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || (!editingId && deviceIds.length === 0)}
            >
              {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-floppy-disk" />}
              {editingId ? 'Speichern' : 'Anlegen'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
              }}
            >
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
                <td className="text-right whitespace-nowrap">
                  <button className="btn-secondary mr-2" onClick={() => openEdit(s)}>
                    <i className="fa-solid fa-pen" />
                  </button>
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
