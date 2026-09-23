import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';
import { AdminDevice } from '../../api/types';

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

export default function AdminDashboardPage() {
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, string>>({});

  function load() {
    apiClient
      .get<AdminDevice[]>('/admin/devices')
      .then((res) => setDevices(res.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function toggleLoaner(device: AdminDevice) {
    await apiClient.patch(`/admin/devices/${device.id}`, { isLoaner: !device.isLoaner });
    load();
  }

  async function setThreshold(deviceId: string, value: string) {
    const warningThresholdPercent = value === '' ? null : Number(value);
    await apiClient.patch(`/admin/devices/${deviceId}`, { warningThresholdPercent });
    load();
  }

  async function shutdown(device: AdminDevice) {
    if (!confirm(`"${device.name}" wirklich herunterfahren?`)) return;
    try {
      await apiClient.post(`/admin/devices/${device.id}/shutdown`);
      alert('Herunterfahren angefordert - wird beim naechsten Kontakt des Geraets ausgefuehrt.');
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function lock(device: AdminDevice) {
    if (!confirm(`"${device.name}" wirklich sperren? Das Geraet zeigt danach nur noch den Sperrbildschirm.`)) return;
    try {
      const res = await apiClient.post<{ lockPin: string }>(`/admin/devices/${device.id}/lock`);
      setRevealedPins((prev) => ({ ...prev, [device.id]: res.data.lockPin }));
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (loading) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  const loaners = devices.filter((d) => d.isLoaner);
  const customerDevices = devices.filter((d) => !d.isLoaner);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">System-Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Leihgeraete und Kundengeraete im Ueberblick.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-700">
          <i className="fa-solid fa-handshake mr-2 text-brand-500" /> Leihgeraete ({loaners.length})
        </h2>
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Geraet</th>
                <th>Mandant</th>
                <th>Status</th>
                <th>Auslastung</th>
                <th>Warngrenze</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loaners.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    Noch keine Geraete als Leihgeraet markiert.
                  </td>
                </tr>
              )}
              {loaners.map((d) => (
                <DeviceRow
                  key={d.id}
                  device={d}
                  revealedPin={revealedPins[d.id]}
                  onToggleLoaner={toggleLoaner}
                  onSetThreshold={setThreshold}
                  onShutdown={shutdown}
                  onLock={lock}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-700">
          <i className="fa-solid fa-building-user mr-2 text-brand-500" /> Kundengeraete ({customerDevices.length})
        </h2>
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Geraet</th>
                <th>Mandant</th>
                <th>Status</th>
                <th>Auslastung</th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customerDevices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    Keine Kundengeraete vorhanden.
                  </td>
                </tr>
              )}
              {customerDevices.map((d) => (
                <DeviceRow
                  key={d.id}
                  device={d}
                  revealedPin={revealedPins[d.id]}
                  onToggleLoaner={toggleLoaner}
                  onSetThreshold={setThreshold}
                  onShutdown={shutdown}
                  onLock={lock}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DeviceRow({
  device,
  revealedPin,
  onToggleLoaner,
  onSetThreshold,
  onShutdown,
  onLock,
}: {
  device: AdminDevice;
  revealedPin?: string;
  onToggleLoaner: (d: AdminDevice) => void;
  onSetThreshold: (deviceId: string, value: string) => void;
  onShutdown: (d: AdminDevice) => void;
  onLock: (d: AdminDevice) => void;
}) {
  const online = device.status === 'ACTIVE' && !!device.lastSeenAt;
  return (
    <tr>
      <td className="font-medium text-slate-800">
        <div className="flex items-center gap-2">
          {device.name}
          {device.locked && (
            <span className="badge bg-red-50 text-red-700">
              <i className="fa-solid fa-lock mr-1" /> Gesperrt
            </span>
          )}
        </div>
        {revealedPin && (
          <div className="text-xs text-brand-700 mt-1">
            Entsperr-PIN (vor Ort eingeben): <span className="font-mono font-semibold">{revealedPin}</span>
          </div>
        )}
      </td>
      <td className="text-slate-500">{device.tenant?.name ?? '- nicht zugeordnet -'}</td>
      <td>
        <span className={`badge ${statusColors[device.status]}`}>{statusLabels[device.status]}</span>
      </td>
      <td>
        {online ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {device.cpuLoadPercent != null && <span>CPU {device.cpuLoadPercent.toFixed(0)}%</span>}
            {device.memUsedPercent != null && <span>RAM {device.memUsedPercent.toFixed(0)}%</span>}
            {device.diskUsedPercent != null && <span>Speicher {device.diskUsedPercent.toFixed(0)}%</span>}
            {device.gpuAvailable && device.gpuTempC != null && <span>GPU {device.gpuTempC.toFixed(0)}&deg;C</span>}
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>
      {device.isLoaner ? (
        <td>
          <input
            type="number"
            min={1}
            max={100}
            className="input w-24"
            placeholder="z.B. 90"
            defaultValue={device.warningThresholdPercent ?? ''}
            onBlur={(e) => onSetThreshold(device.id, e.target.value)}
          />
        </td>
      ) : (
        <td />
      )}
      <td className="text-right whitespace-nowrap">
        {device.isLoaner && (
          <>
            <button className="btn-secondary mr-2" onClick={() => onShutdown(device)} title="Herunterfahren">
              <i className="fa-solid fa-power-off" />
            </button>
            {!device.locked && (
              <button className="btn-secondary mr-2" onClick={() => onLock(device)} title="Sperren">
                <i className="fa-solid fa-lock" />
              </button>
            )}
          </>
        )}
      </td>
      <td className="text-right">
        <button
          className="btn-secondary"
          onClick={() => onToggleLoaner(device)}
          title={device.isLoaner ? 'Als Kundengeraet markieren' : 'Als Leihgeraet markieren'}
        >
          {device.isLoaner ? 'Leihgeraet aufheben' : 'Als Leihgeraet markieren'}
        </button>
      </td>
    </tr>
  );
}
