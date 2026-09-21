import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { Tenant } from '../../api/types';

export default function TenantDetailAdminPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [maxMonitors, setMaxMonitors] = useState(0);
  const [maxUsers, setMaxUsers] = useState(0);
  const [maxStorageMb, setMaxStorageMb] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    apiClient.get<Tenant>(`/tenants/${tenantId}`).then((res) => {
      setTenant(res.data);
      setMaxMonitors(res.data.license?.maxMonitors ?? 5);
      setMaxUsers(res.data.license?.maxUsers ?? 5);
      setMaxStorageMb(res.data.license?.maxStorageMb ?? 1024);
      setValidUntil(res.data.license?.validUntil?.slice(0, 10) ?? '');
    });
  }

  useEffect(load, [tenantId]);

  async function handleSaveLicense(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/tenants/${tenantId}/license`, {
        maxMonitors,
        maxUsers,
        maxStorageMb,
        validUntil: validUntil || undefined,
        active: true,
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!tenant) return;
    await apiClient.patch(`/tenants/${tenantId}`, { active: !tenant.active });
    load();
  }

  async function handleDelete() {
    if (!confirm(`Mandant "${tenant?.name}" inkl. aller Daten wirklich loeschen?`)) return;
    await apiClient.delete(`/tenants/${tenantId}`);
    navigate('/admin/tenants');
  }

  if (!tenant) {
    return <i className="fa-solid fa-circle-notch fa-spin text-slate-400" />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{tenant.name}</h1>
          <p className="text-sm text-slate-500">Slug: {tenant.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/tenants/${tenant.id}`} className="btn-secondary">
            <i className="fa-solid fa-arrow-up-right-from-square" /> Mandanten-Bereich oeffnen
          </Link>
          <button className="btn-secondary" onClick={toggleActive}>
            <i className="fa-solid fa-power-off" /> {tenant.active ? 'Deaktivieren' : 'Aktivieren'}
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            <i className="fa-solid fa-trash" /> Loeschen
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveLicense} className="card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-slate-700">
          <i className="fa-solid fa-id-card mr-2 text-brand-500" /> Lizenz
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Max. Monitore</label>
            <input
              type="number"
              min={0}
              className="input"
              value={maxMonitors}
              onChange={(e) => setMaxMonitors(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Max. Benutzer</label>
            <input
              type="number"
              min={0}
              className="input"
              value={maxUsers}
              onChange={(e) => setMaxUsers(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Max. Speicher (MB)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={maxStorageMb}
              onChange={(e) => setMaxStorageMb(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="label">Gueltig bis (optional)</label>
          <input
            type="date"
            className="input max-w-xs"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button type="submit" disabled={saving} className="btn-primary">
            Lizenz speichern
          </button>
        </div>
      </form>
    </div>
  );
}
