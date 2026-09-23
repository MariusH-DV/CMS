import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { Device, Playlist } from '../../api/types';

const statusLabels: Record<string, string> = {
  PENDING: 'Wartet auf Registrierung',
  ACTIVE: 'Aktiv',
  OFFLINE: 'Offline',
  DISABLED: 'Deaktiviert',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  OFFLINE: 'bg-slate-100 text-slate-500',
  DISABLED: 'bg-red-50 text-red-700',
};

export default function DevicesPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showClaim, setShowClaim] = useState(false);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  function load() {
    apiClient.get<Device[]>(`/tenants/${tenantId}/devices`).then((res) => setDevices(res.data));
    apiClient.get<Playlist[]>(`/tenants/${tenantId}/playlists`).then((res) => setPlaylists(res.data));
  }

  useEffect(load, [tenantId]);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/tenants/${tenantId}/devices/claim`, { pin, name });
      setPin('');
      setName('');
      setClaimSuccess(true);
      load();
      setTimeout(() => {
        setClaimSuccess(false);
        setShowClaim(false);
      }, 1800);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function assignPlaylist(deviceId: string, playlistId: string) {
    await apiClient.patch(`/tenants/${tenantId}/devices/${deviceId}`, {
      playlistId: playlistId || null,
    });
    load();
  }

  async function removeDevice(deviceId: string) {
    if (!confirm('Geraet wirklich entfernen? Es kann sich danach mit einer neuen PIN erneut registrieren.')) return;
    await apiClient.delete(`/tenants/${tenantId}/devices/${deviceId}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Geraete</h1>
          <p className="text-sm text-slate-500">
            Starte den CMS Player auf einem Raspberry Pi und gib die angezeigte PIN hier ein.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowClaim((v) => !v)}>
          <i className="fa-solid fa-key" /> PIN eingeben
        </button>
      </div>

      {showClaim && (
        <div className="card p-5 max-w-md">
          {claimSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 animate-pop-in">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse-glow">
                <i className="fa-solid fa-check text-2xl text-emerald-600" />
              </div>
              <div className="text-emerald-700 font-medium">Geraet erfolgreich registriert!</div>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="flex flex-col gap-4">
              <div>
                <label className="label">PIN (auf dem Bildschirm des Pi)</label>
                <input
                  className="input tracking-widest text-lg"
                  required
                  maxLength={6}
                  minLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                />
              </div>
              <div>
                <label className="label">Anzeigename</label>
                <input
                  className="input"
                  required
                  placeholder="z.B. Eingang, Schaufenster"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary">
                  Registrieren
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowClaim(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Zuletzt gesehen</th>
              <th>Standard-Playlist</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Noch keine Geraete registriert.
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.id}>
                <td className="font-medium text-slate-800">{d.name}</td>
                <td>
                  <span className={`badge ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
                </td>
                <td className="text-slate-500">
                  {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('de-DE') : 'nie'}
                </td>
                <td>
                  <select
                    className="input"
                    value={d.playlistId ?? ''}
                    onChange={(e) => assignPlaylist(d.id, e.target.value)}
                  >
                    <option value="">- keine -</option>
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-right">
                  <button className="btn-danger" onClick={() => removeDevice(d.id)}>
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
