import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div />
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              <i className="fa-regular fa-user mr-2" />
              {user?.firstName} {user?.lastName}
              {user?.isSystemAdmin && (
                <span className="badge bg-brand-50 text-brand-700 ml-2">System-Admin</span>
              )}
            </div>
            <button onClick={logout} className="btn-secondary">
              <i className="fa-solid fa-right-from-bracket" /> Abmelden
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
