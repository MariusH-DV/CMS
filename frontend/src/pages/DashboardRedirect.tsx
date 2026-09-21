import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardRedirect() {
  const { user } = useAuth();

  if (user?.isSystemAdmin) {
    return <Navigate to="/admin/tenants" replace />;
  }
  if (user && user.memberships.length > 0) {
    return <Navigate to={`/tenants/${user.memberships[0].tenantId}`} replace />;
  }
  return (
    <div className="card p-8 text-center text-slate-500">
      <i className="fa-regular fa-face-frown text-3xl mb-3" />
      <p>Dir ist noch kein Mandant zugewiesen. Bitte wende dich an deinen Administrator.</p>
    </div>
  );
}
