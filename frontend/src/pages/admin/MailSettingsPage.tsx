import { FormEvent, useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';
import { MailSettings } from '../../api/types';

export default function MailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<MailSettings>('/admin/mail-settings')
      .then((res) => {
        const s = res.data;
        setEnabled(s.enabled);
        setHost(s.host ?? '');
        setPort(s.port ?? 587);
        setSecure(s.secure);
        setUsername(s.username ?? '');
        setPasswordSet(s.passwordSet);
        setFromAddress(s.fromAddress ?? '');
        setFromName(s.fromName ?? '');
        setAlertRecipientEmail(s.alertRecipientEmail ?? '');
        setTestAddress(s.alertRecipientEmail ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        enabled,
        host,
        port,
        secure,
        username,
        fromAddress,
        fromName,
        alertRecipientEmail,
      };
      // Passwort nur mitschicken, wenn tatsaechlich ein neues eingegeben wurde -
      // das bestehende bleibt sonst unveraendert (siehe MailController.get(), das
      // das gespeicherte Passwort nie im Klartext zurueckgibt).
      if (password) {
        payload.password = password;
      }
      await apiClient.put('/admin/mail-settings', payload);
      setPasswordSet(passwordSet || Boolean(password));
      setPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestSending(true);
    setTestResult(null);
    try {
      await apiClient.post('/admin/mail-settings/test', { to: testAddress });
      setTestResult('Test-Mail wurde verschickt.');
    } catch (err) {
      setTestResult(apiErrorMessage(err));
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Mailserver-Einstellungen</h1>
        <p className="text-sm text-slate-500">
          Fuer kritische Meldungen (Warngrenzen bei Leihgeraeten, Lizenzablauf in weniger als 7 Tagen).
        </p>
      </div>

      <form onSubmit={handleSave} className="card p-5 flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Mailversand aktiviert
        </label>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">SMTP-Host</label>
            <input className="input" placeholder="smtp.strato.de" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <div>
            <label className="label">Port</label>
            <input
              type="number"
              className="input"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
          Verbindung ueber TLS/SSL (secure) - typischerweise bei Port 465 aktivieren
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Benutzername</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">Passwort {passwordSet && <span className="text-slate-400">(hinterlegt)</span>}</label>
            <input
              type="password"
              className="input"
              placeholder={passwordSet ? 'unveraendert lassen' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Absender-Adresse</label>
            <input
              type="email"
              className="input"
              placeholder="cms@deine-domain.de"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Absender-Name</label>
            <input className="input" placeholder="Zentrale CMS" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Empfaenger fuer kritische Meldungen</label>
          <input
            type="email"
            className="input"
            placeholder="info@hosman.events"
            value={alertRecipientEmail}
            onChange={(e) => setAlertRecipientEmail(e.target.value)}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {saved && <div className="text-sm text-emerald-600">Gespeichert.</div>}

        <div>
          <button type="submit" disabled={saving} className="btn-primary">
            Speichern
          </button>
        </div>
      </form>

      <div className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-slate-700">Test-Mail senden</h2>
        <div className="flex gap-2">
          <input
            type="email"
            className="input flex-1"
            placeholder="empfaenger@example.com"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
          />
          <button type="button" className="btn-secondary" disabled={testSending || !testAddress} onClick={handleTest}>
            {testSending ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Senden'}
          </button>
        </div>
        {testResult && <div className="text-sm text-slate-600">{testResult}</div>}
      </div>
    </div>
  );
}
