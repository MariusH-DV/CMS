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
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(
        `/tenants/${tenantId}/provisioning/package`,
        {
          ssid: ssid || undefined,
          wifiPassword: wifiPassword || undefined,
          deviceLabel: deviceLabel || undefined,
        },
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
      setDownloaded(true);
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
          Lade das Bereitstellungspaket fuer einen neuen Raspberry-Pi-Player herunter.
        </p>
      </div>

      <div className="card p-5 text-sm text-slate-600 flex flex-col gap-2 border-brand-200 bg-brand-50/40">
        <div className="font-medium text-slate-700">
          <i className="fa-solid fa-circle-info text-brand-500 mr-2" />
          WLAN am besten direkt im Raspberry Pi Imager einrichten
        </div>
        <p>
          Aktuelle Raspberry Pi OS Versionen richten Benutzer, WLAN und SSH bereits beim Flashen
          ein (Zahnrad-Symbol &quot;OS anpassen&quot; im Raspberry Pi Imager). Trag WLAN dort direkt
          ein - die Felder unten sind nur ein <strong>optionaler Fallback</strong> (z.B. wenn du den
          Pi manuell per SSH einrichtest oder WLAN im Imager vergessen hast).
        </p>
      </div>

      <form onSubmit={handleDownload} className="card p-5 flex flex-col gap-4">
        <div>
          <label className="label">WLAN-Name / SSID (optional)</label>
          <input className="input" value={ssid} onChange={(e) => setSsid(e.target.value)} />
        </div>
        <div>
          <label className="label">WLAN-Passwort (optional)</label>
          <input
            type="password"
            className="input"
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

      <div className="card p-5 text-sm text-slate-600 flex flex-col gap-3">
        <div className="font-medium text-slate-700">
          <i className="fa-solid fa-list-check text-brand-500 mr-2" />
          So geht es weiter (Option A - frische SD-Karte)
        </div>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            Mit dem{' '}
            <a
              className="text-brand-600 underline"
              href="https://www.raspberrypi.com/software/"
              target="_blank"
              rel="noreferrer"
            >
              Raspberry Pi Imager
            </a>{' '}
            <strong>Raspberry Pi OS Lite (64-bit)</strong> flashen. Im Anpassen-Dialog (Zahnrad-Symbol)
            Benutzername + Passwort setzen, WLAN eintragen und SSH aktivieren.
          </li>
          <li>ZIP-Datei entpacken (eine ausfuehrliche README.md liegt bei).</li>
          <li>
            SD-Karte erneut einlegen, den Ordner <code>cms-provisioning</code> in das Wurzelverzeichnis
            des Boot-Laufwerks kopieren.
          </li>
          <li>
            Die Datei <code>user-data</code> auf dem Boot-Laufwerk (vom Imager bereits angelegt) gemaess{' '}
            <code>cms-provisioning/userdata-append.txt</code> um einen Startbefehl ergaenzen - kein
            Bearbeiten von <code>cmdline.txt</code> mehr noetig.
          </li>
          <li>SD-Karte in den Pi stecken, starten. Nach ca. 5-10 Minuten (inkl. einem automatischen Neustart)
            erscheint eine 6-stellige PIN auf dem Bildschirm.</li>
          <li>
            Unter <strong>Geraete &rarr; PIN eingeben</strong> die PIN eintragen - der Pi ist danach
            dauerhaft registriert und startet kuenftig automatisch.
          </li>
        </ol>
        <p className="text-xs text-slate-400">
          Ausfuehrliche Anleitung inkl. Option B (bereits laufender Pi per SSH):{' '}
          <a
            className="text-brand-600 underline"
            href="https://github.com/MariusH-DV/CMS/blob/main/docs/raspberry-pi.md"
            target="_blank"
            rel="noreferrer"
          >
            docs/raspberry-pi.md
          </a>
        </p>
        {downloaded && (
          <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <i className="fa-solid fa-check mr-2" />
            Paket heruntergeladen - jetzt mit Schritt 1 oben weitermachen.
          </div>
        )}
      </div>
    </div>
  );
}
