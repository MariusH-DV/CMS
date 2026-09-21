import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';

export default function ProvisioningPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(
        `/tenants/${tenantId}/provisioning/package`,
        { ssid, wifiPassword, deviceLabel: deviceLabel || undefined },
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cms-provisioning.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Raspberry-Pi-Bereitstellung</h1>
        <p className="text-sm text-slate-500">
          Lege zuerst das WLAN fest, mit dem sich der Raspberry Pi verbinden soll, und lade dann das
          Bereitstellungspaket herunter.
        </p>
      </div>

      <form onSubmit={handleDownload} className="card p-5 flex flex-col gap-4">
        <div>
          <label className="label">WLAN-Name (SSID)</label>
          <input className="input" required value={ssid} onChange={(e) => setSsid(e.target.value)} />
        </div>
        <div>
          <label className="label">WLAN-Passwort</label>
          <input
            type="password"
            className="input"
            required
            minLength={8}
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Geraetebezeichnung (optional)</label>
          <input
            className="input"
            placeholder="z.B. Empfang"
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-download" />}
            Bereitstellungspaket herunterladen
          </button>
        </div>
      </form>

      <div className="card p-5 text-sm text-slate-600 flex flex-col gap-2">
        <div className="font-medium text-slate-700">
          <i className="fa-solid fa-circle-info text-brand-500 mr-2" />
          So geht es weiter
        </div>
        <ol className="list-decimal list-inside space-y-1">
          <li>ZIP-Datei entpacken - eine Anleitung (README.md) liegt bei.</li>
          <li>Auf einer frischen SD-Karte oder einem bereits laufenden Pi installieren (siehe README).</li>
          <li>Nach dem Start zeigt der Bildschirm eine 6-stellige PIN.</li>
          <li>
            Unter <strong>Geraete &rarr; PIN eingeben</strong> die PIN eintragen - der Pi ist danach dauerhaft
            registriert und startet kuenftig automatisch.
          </li>
        </ol>
      </div>
    </div>
  );
}
