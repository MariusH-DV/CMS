import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../api/types';
import logo from '../assets/logo.png';

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export default function Sidebar() {
  const { user, hasPermission } = useAuth();
  const { tenantId } = useParams();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 px-2 py-1">
        <img src={logo} alt="Logo" className="h-8 w-8 rounded-md object-cover" />
        <span className="font-semibold text-slate-800">Zentrale CMS</span>
      </div>

      {user?.isSystemAdmin && (
        <div>
          <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            System-Admin
          </div>
          <nav className="flex flex-col gap-1">
            <NavLink to="/admin/tenants" className={navClass}>
              <i className="fa-solid fa-building w-4" /> Mandanten
            </NavLink>
            <NavLink to="/admin/users" className={navClass}>
              <i className="fa-solid fa-users-gear w-4" /> Benutzer
            </NavLink>
          </nav>
        </div>
      )}

      {tenantId && (
        <div>
          <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Mandant
          </div>
          <nav className="flex flex-col gap-1">
            <NavLink to={`/tenants/${tenantId}`} end className={navClass}>
              <i className="fa-solid fa-gauge w-4" /> Uebersicht
            </NavLink>
            {hasPermission(tenantId, PERMISSIONS.DEVICES_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/devices`} className={navClass}>
                <i className="fa-solid fa-display w-4" /> Geraete
              </NavLink>
            )}
            {hasPermission(tenantId, PERMISSIONS.MEDIA_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/media`} className={navClass}>
                <i className="fa-solid fa-photo-film w-4" /> Medien
              </NavLink>
            )}
            {hasPermission(tenantId, PERMISSIONS.PLAYLISTS_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/playlists`} className={navClass}>
                <i className="fa-solid fa-list-ol w-4" /> Playlists
              </NavLink>
            )}
            {hasPermission(tenantId, PERMISSIONS.SCHEDULES_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/schedules`} className={navClass}>
                <i className="fa-solid fa-calendar-days w-4" /> Zeitplaene
              </NavLink>
            )}
            {hasPermission(tenantId, PERMISSIONS.DEVICES_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/provisioning`} className={navClass}>
                <i className="fa-solid fa-raspberry-pi w-4" /> Pi-Bereitstellung
              </NavLink>
            )}
            {hasPermission(tenantId, PERMISSIONS.USERS_MANAGE) && (
              <NavLink to={`/tenants/${tenantId}/members`} className={navClass}>
                <i className="fa-solid fa-user-group w-4" /> Benutzer &amp; Rechte
              </NavLink>
            )}
          </nav>
        </div>
      )}

      {user && user.memberships.length > 0 && (
        <div>
          <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Meine Mandanten
          </div>
          <nav className="flex flex-col gap-1">
            {user.memberships.map((m) => (
              <NavLink key={m.tenantId} to={`/tenants/${m.tenantId}`} className={navClass}>
                <i className="fa-solid fa-building-user w-4" />
                {m.tenant?.name ?? m.tenantId}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </aside>
  );
}
