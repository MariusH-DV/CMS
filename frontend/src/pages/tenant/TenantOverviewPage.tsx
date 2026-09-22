import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { Tenant } from '../../api/types';

export default function TenantOverviewPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    apiClient
      .get<Tenant>(`/tenants/${tenantId}`)
      .then((res) => setTenant(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [tenantId]);

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
    );
  }

  if (!tenant) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  const license = tenant.license;
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
