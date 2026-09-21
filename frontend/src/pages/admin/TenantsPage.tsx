import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { Tenant } from '../../api/types';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [maxMonitors, setMaxMonitors] = useState(5);
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxStorageMb, setMaxStorageMb] = useState(1024);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    apiClient
      .get<Tenant[]>('/tenants')
      .then((res) => setTenants(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/tenants', { name, slug, maxMonitors, maxUsers, maxStorageMb });
      setShowCreate(false);
      setName('');
      setSlug('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Mandanten</h1>
          <p className="text-sm text-slate-500">Verwalte alle Mandanten und deren Lizenzen.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <i className="fa-solid fa-plus" /> Neuer Mandant
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Slug (Ordnername)</label>
              <input
                className="input"
                required
                pattern="[a-z0-9-]+"
                placeholder="z.B. musterfirma"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
              />
            </div>
          </div>
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
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              Anlegen
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Lizenz</th>
              <th>Geraete</th>
              <th>Benutzer</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin" />
                </td>
              </tr>
            )}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  Noch keine Mandanten angelegt.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-slate-800">{t.name}</td>
                <td className="text-slate-500">{t.slug}</td>
                <td className="text-slate-500">
                  {t.license
                    ? `${t._count?.devices ?? 0}/${t.license.maxMonitors} Monitore, ${t.license.maxStorageMb} MB`
                    : '-'}
                </td>
                <td>{t._count?.devices ?? 0}</td>
                <td>{t._count?.memberships ?? 0}</td>
                <td>
                  <span
                    className={`badge ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {t.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="text-right">
                  <Link to={`/admin/tenants/${t.id}`} className="btn-secondary">
                    <i className="fa-solid fa-gear" /> Verwalten
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
