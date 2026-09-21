import { FormEvent, useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '../../api/client';

interface GlobalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
  active: boolean;
  memberships: { tenantId: string; role: string; tenant: { name: string } }[];
}

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiClient.get<GlobalUser[]>('/users').then((res) => setUsers(res.data));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/users', { email, password, firstName, lastName, isSystemAdmin });
      setShowCreate(false);
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setIsSystemAdmin(false);
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
          <h1 className="text-xl font-semibold text-slate-800">Benutzer (global)</h1>
          <p className="text-sm text-slate-500">
            Alle Benutzerkonten im System. Mandanten-Zuordnung erfolgt im jeweiligen Mandanten.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <i className="fa-solid fa-plus" /> Neuer Benutzer
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 flex flex-col gap-4 max-w-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vorname</label>
              <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Nachname</label>
              <input className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Passwort</label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={isSystemAdmin} onChange={(e) => setIsSystemAdmin(e.target.checked)} />
            System-Admin (voller Zugriff auf alle Mandanten)
          </label>
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
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Mandanten</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-800">
                  {u.firstName} {u.lastName}
                </td>
                <td className="text-slate-500">{u.email}</td>
                <td>
                  {u.isSystemAdmin && <span className="badge bg-brand-50 text-brand-700">System-Admin</span>}
                </td>
                <td className="text-slate-500">
                  {u.memberships.map((m) => m.tenant?.name).filter(Boolean).join(', ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
