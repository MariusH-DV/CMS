import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Sperrt alle Mandanten-Unterseiten (Geraete, Medien, Playlists, ...) fuer
 * deaktivierte Mandanten und leitet stattdessen zur Uebersicht um, die den
 * Deaktivierungs-Hinweis anzeigt. System-Admins sind nicht betroffen.
 */
export default function TenantActiveGuard() {
  const { user } = useAuth();
  const { tenantId } = useParams<{ tenantId: string }>();

  const membership = user?.memberships.find((m) => m.tenantId === tenantId);
  const tenantActive = membership?.tenant?.active ?? true;

  if (!user?.isSystemAdmin && !tenantActive) {
    return <Navigate to={`/tenants/${tenantId}`} replace />;
  }

  return <Outlet />;
}
