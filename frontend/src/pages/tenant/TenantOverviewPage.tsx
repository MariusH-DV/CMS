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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{tenant.name}</h1>
        <p className="text-sm text-slate-500">Willkommen im Verwaltungsbereich deines Mandanten.</p>
      </div>

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
        <div className="card p-5">
          <div className="text-xs uppercase text-slate-400 font-semibold mb-1">Speicher</div>
          <div className="text-2xl font-semibold text-slate-800">{license?.maxStorageMb ?? '-'} MB</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to={`/tenants/${tenantId}/devices`} className="card p-5 hover:border-brand-300 transition-colors">
          <i className="fa-solid fa-display text-brand-500 mb-2 text-xl" />
          <div className="font-medium text-slate-800">Geraete verwalten</div>
          <div className="text-sm text-slate-500">Raspberry Pis registrieren und Playlists zuweisen.</div>
        </Link>
        <Link to={`/tenants/${tenantId}/provisioning`} className="card p-5 hover:border-brand-300 transition-colors">
          <i className="fa-solid fa-raspberry-pi text-brand-500 mb-2 text-xl" />
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
    </div>
  );
}
