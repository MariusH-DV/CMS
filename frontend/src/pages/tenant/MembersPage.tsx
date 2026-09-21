import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient, apiErrorMessage } from '../../api/client';
import { PERMISSIONS, TenantMembership } from '../../api/types';

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.USERS_MANAGE]: 'Benutzer & Rechte',
  [PERMISSIONS.DEVICES_MANAGE]: 'Geraete',
  [PERMISSIONS.MEDIA_MANAGE]: 'Medien',
  [PERMISSIONS.PLAYLISTS_MANAGE]: 'Playlists',
  [PERMISSIONS.SCHEDULES_MANAGE]: 'Zeitplaene',
  [PERMISSIONS.TENANT_SETTINGS_MANAGE]: 'Mandanten-Einstellungen',
};

export default function MembersPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [members, setMembers] = useState<TenantMembership[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'TENANT_ADMIN' | 'TENANT_USER'>('TENANT_USER');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient.get<TenantMembership[]>(`/tenants/${tenantId}/members`).then((res) => setMembers(res.data));
  }

  useEffect(load, [tenantId]);

  function togglePermission(key: string) {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/tenants/${tenantId}/members`, {
        email,
        password: password || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role,
        permissions,
      });
      setShowCreate(false);
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRole('TENANT_USER');
      setPermissions([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function updateMemberPermissions(membershipId: string, current: TenantMembership, key: string) {
    const next = current.permissions.includes(key)
      ? current.permissions.filter((p) => p !== key)
      : [...current.permissions, key];
    await apiClient.patch(`/tenants/${tenantId}/members/${membershipId}`, { permissions: next });
    load();
  }

  async function updateMemberRole(membershipId: string, role: string) {
    await apiClient.patch(`/tenants/${tenantId}/members/${membershipId}`, { role });
    load();
  }

  async function removeMember(membershipId: string) {
    if (!confirm('Mitglied wirklich aus dem Mandanten entfernen?')) return;
    await apiClient.delete(`/tenants/${tenantId}/members/${membershipId}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Benutzer &amp; Rechte</h1>
          <p className="text-sm text-slate-500">
            Mandant-Admins haben vollen Zugriff auf diesen Mandanten. Mandant-Benutzer erhalten nur die
            hier ausgewaehlten Berechtigungen.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <i className="fa-solid fa-user-plus" /> Benutzer hinzufuegen
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 flex flex-col gap-4 max-w-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vorname (bei neuem Benutzer)</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Nachname (bei neuem Benutzer)</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Passwort (nur bei neuem Benutzer noetig)</label>
            <input
              type="password"
              className="input"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rolle</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'TENANT_ADMIN' | 'TENANT_USER')}>
              <option value="TENANT_USER">Mandant-Benutzer (nur ausgewaehlte Rechte)</option>
              <option value="TENANT_ADMIN">Mandant-Admin (voller Zugriff)</option>
            </select>
          </div>
          {role === 'TENANT_USER' && (
            <div>
              <label className="label">Berechtigungen</label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={permissions.includes(key)} onChange={() => togglePermission(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Hinzufuegen
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-slate-800">
                  {m.user.firstName} {m.user.lastName}
                </div>
                <div className="text-sm text-slate-500">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="input"
                  value={m.role}
                  onChange={(e) => updateMemberRole(m.id, e.target.value)}
                >
                  <option value="TENANT_USER">Mandant-Benutzer</option>
                  <option value="TENANT_ADMIN">Mandant-Admin</option>
                </select>
                <button className="btn-danger" onClick={() => removeMember(m.id)}>
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </div>
            {m.role === 'TENANT_USER' && (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={m.permissions.includes(key)}
                      onChange={() => updateMemberPermissions(m.id, m, key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
