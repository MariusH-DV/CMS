import { ChangeEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { DeviceStatusInfo, PERMISSIONS, Tenant } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

function formatUptime(seconds: number | null): string {
  if (seconds == null) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} Tag${days === 1 ? '' : 'e'} ${hours} Std`;
  if (hours > 0) return `${hours} Std ${minutes} Min`;
  return `${minutes} Min`;
}

export default function TenantOverviewPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { hasPermission } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [devices, setDevices] = useState<DeviceStatusInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [hasLogo, setHasLogo] = useState(true);
  const [logoVersion, setLogoVersion] = useState(0);

  useEffect(() => {
    setError(null);
    apiClient
      .get<Tenant>(`/tenants/${tenantId}`)
      .then((res) => setTenant(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [tenantId]);

  useEffect(() => {
    if (!tenant?.active) return;
    function load() {
      apiClient
        .get<DeviceStatusInfo[]>(`/tenants/${tenantId}/devices/status`)
        .then((res) => setDevices(res.data))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [tenantId, tenant?.active]);

  async function handleLogoUpload() {
    if (!tenantId || !logoFile) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      await apiClient.post(`/tenants/${tenantId}/branding/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Volles Neuladen, damit auch die Sidebar (die bei fehlendem Logo einmalig
      // auf das Standard-Logo zurueckfaellt und danach nicht erneut versucht)
      // das neue Logo sofort anzeigt, ohne dass der Nutzer selbst neu laden muss.
      window.location.reload();
    } catch (err) {
      setLogoError(apiErrorMessage(err));
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    if (!tenantId) return;
    await apiClient.delete(`/tenants/${tenantId}/branding/logo`);
    window.location.reload();
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
    );
  }

  if (!tenant) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  const license = tenant.license;
  const canManageBranding = tenantId ? hasPermission(tenantId, PERMISSIONS.TENANT_SETTINGS_MANAGE) : false;
  const maxStorageBytes = (license?.maxStorageMb ?? 0) * 1024 * 1024;
  const usedStorageBytes = tenant.usedStorageBytes ?? 0;
  const usedPercent = maxStorageBytes > 0 ? Math.min(100, (usedStorageBytes / maxStorageBytes) * 100) : 0;
  const freePercent = 100 - usedPercent;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{tenant.name}</h1>
        <p className="text-sm text-slate-500">Willkommen im Verwaltungsbereich deines Mandanten.</p>
      </div>

      {!tenant.active && (
        <div className="card p-5 border-red-300 bg-red-50/70">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
            <i className="fa-solid fa-lock" /> Mandant deaktiviert
          </div>
          <p className="text-sm text-red-700">
            Dieser Mandant wurde deaktiviert. Alle Bereiche ausser dieser Uebersicht sind gesperrt.
          </p>
          {tenant.deactivationReason && (
            <p className="text-sm text-red-600 mt-2">
              <span className="font-medium">Grund:</span> {tenant.deactivationReason}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Monitore</div>
          <div className="text-2xl font-semibold text-slate-800">
            {tenant._count?.devices ?? 0}{' '}
            <span className="text-sm text-slate-400 font-normal">/ {license?.maxMonitors ?? '-'}</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Benutzer</div>
          <div className="text-2xl font-semibold text-slate-800">
            {tenant._count?.memberships ?? 0}{' '}
            <span className="text-sm text-slate-400 font-normal">/ {license?.maxUsers ?? '-'}</span>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <StorageDonut usedPercent={usedPercent} />
          <div>
            <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Speicher frei</div>
            <div className="text-2xl font-semibold text-slate-800">{freePercent.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">von {license?.maxStorageMb ?? '-'} MB</div>
          </div>
        </div>
      </div>

      {tenant.active && devices.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-3">
            <i className="fa-solid fa-gauge-high mr-2 text-brand-500" /> Geraete-Status
          </h2>
          <div className="flex flex-col gap-3">
            {devices.map((d) => {
              const online = d.online;
              return (
                <div key={d.id} className="flex items-center gap-4 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${online ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div className="w-40 shrink-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
                    <div className="text-xs text-slate-400">
                      {online ? `Uptime ${formatUptime(d.uptimeSeconds)}` : 'Offline'}
                    </div>
                  </div>
                  {online ? (
                    <div className="flex flex-1 flex-wrap items-center gap-4">
                      <UsageBar label="CPU" percent={d.cpuLoadPercent} />
                      <UsageBar label="RAM" percent={d.memUsedPercent} />
                      <UsageBar label="Speicher" percent={d.diskUsedPercent} />
                      {d.gpuAvailable && d.gpuTempC != null && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <i className="fa-solid fa-temperature-half text-slate-400" /> GPU {d.gpuTempC.toFixed(0)}&deg;C
                        </div>
                      )}
                      {d.playerVersion && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                          <i className="fa-solid fa-code-branch" /> v{d.playerVersion}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tenant.active && license?.brandingEnabled && canManageBranding && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-3">
            <i className="fa-solid fa-image mr-2 text-brand-500" /> Branding
          </h2>
          <div className="flex items-center gap-4">
            {hasLogo && (
              <img
                src={`/api/tenants/${tenantId}/branding/logo?v=${logoVersion}`}
                alt="Eigenes Logo"
                className="h-16 w-16 rounded-lg object-cover border border-slate-200 bg-white"
                onError={() => setHasLogo(false)}
              />
            )}
            <div className="flex items-center gap-2 flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLogoFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-600"
              />
              <button
                type="button"
                disabled={!logoFile || logoUploading}
                onClick={handleLogoUpload}
                className="btn-primary"
              >
                Hochladen
              </button>
              {hasLogo && (
                <button type="button" className="btn-secondary" onClick={handleLogoRemove}>
                  Entfernen
                </button>
              )}
            </div>
          </div>
          {logoError && <div className="text-sm text-red-600 mt-2">{logoError}</div>}
          <p className="text-xs text-slate-400 mt-2">
            Wird in der Seitenleiste und auf deinen Raspberry-Pi-Bildschirmen anstelle des Standard-Logos angezeigt.
          </p>
        </div>
      )}

      {tenant.active && (
        <div className="grid grid-cols-2 gap-4">
          <Link to={`/tenants/${tenantId}/devices`} className="card p-5 hover:border-brand-300 transition-colors">
            <i className="fa-solid fa-display text-brand-500 mb-2 text-xl" />
            <div className="font-medium text-slate-800">Geraete verwalten</div>
            <div className="text-sm text-slate-500">Raspberry Pis registrieren und Playlists zuweisen.</div>
          </Link>
          <Link to={`/tenants/${tenantId}/provisioning`} className="card p-5 hover:border-brand-300 transition-colors">
            <i className="fa-brands fa-raspberry-pi text-brand-500 mb-2 text-xl" />
            <div className="font-medium text-slate-800">Neuen Pi einrichten</div>
            <div className="text-sm text-slate-500">WLAN festlegen und Bereitstellungspaket herunterladen.</div>
          </Link>
          <Link to={`/tenants/${tenantId}/playlists`} className="card p-5 hover:border-brand-300 transition-colors">
            <i className="fa-solid fa-list-ol text-brand-500 mb-2 text-xl" />
            <div className="font-medium text-slate-800">Playlists</div>
            <div className="text-sm text-slate-500">Inhalte fuer die Bildschirme zusammenstellen.</div>
          </Link>
          <Link to={`/tenants/${tenantId}/members`} className="card p-5 hover:border-brand-300 transition-colors">
            <i className="fa-solid fa-user-group text-brand-500 mb-2 text-xl" />
            <div className="font-medium text-slate-800">Benutzer &amp; Rechte</div>
            <div className="text-sm text-slate-500">Team-Mitglieder einladen und Berechtigungen verteilen.</div>
          </Link>
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, percent }: { label: string; percent: number | null }) {
  if (percent == null) return null;
  const clamped = Math.min(100, Math.max(0, percent));
  const color = clamped >= 90 ? '#dc2626' : clamped >= 70 ? '#f59e0b' : '#22c55e';
  return (
    <div className="w-28">
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>{label}</span>
        <span>{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StorageDonut({ usedPercent }: { usedPercent: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - usedPercent / 100);
  const color = usedPercent >= 90 ? '#dc2626' : usedPercent >= 70 ? '#f59e0b' : '#22c55e';

  return (
    <svg width={64} height={64} viewBox="0 0 64 64" className="shrink-0">
      <circle cx={32} cy={32} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={32}
        cy={32}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
      />
    </svg>
  );
}
