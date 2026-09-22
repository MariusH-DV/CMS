import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import TenantActiveGuard from './components/TenantActiveGuard';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardRedirect from './pages/DashboardRedirect';
import TenantsPage from './pages/admin/TenantsPage';
import TenantDetailAdminPage from './pages/admin/TenantDetailAdminPage';
import GlobalUsersPage from './pages/admin/GlobalUsersPage';
import TenantOverviewPage from './pages/tenant/TenantOverviewPage';
import DevicesPage from './pages/tenant/DevicesPage';
import MediaPage from './pages/tenant/MediaPage';
import PlaylistsPage from './pages/tenant/PlaylistsPage';
import PlaylistDetailPage from './pages/tenant/PlaylistDetailPage';
import SchedulesPage from './pages/tenant/SchedulesPage';
import ProvisioningPage from './pages/tenant/ProvisioningPage';
import MembersPage from './pages/tenant/MembersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardRedirect />} />

          <Route path="/admin/tenants" element={<TenantsPage />} />
          <Route path="/admin/tenants/:tenantId" element={<TenantDetailAdminPage />} />
          <Route path="/admin/users" element={<GlobalUsersPage />} />

          <Route path="/tenants/:tenantId" element={<TenantOverviewPage />} />

          <Route element={<TenantActiveGuard />}>
            <Route path="/tenants/:tenantId/devices" element={<DevicesPage />} />
            <Route path="/tenants/:tenantId/media" element={<MediaPage />} />
            <Route path="/tenants/:tenantId/playlists" element={<PlaylistsPage />} />
            <Route path="/tenants/:tenantId/playlists/:playlistId" element={<PlaylistDetailPage />} />
            <Route path="/tenants/:tenantId/schedules" element={<SchedulesPage />} />
            <Route path="/tenants/:tenantId/provisioning" element={<ProvisioningPage />} />
            <Route path="/tenants/:tenantId/members" element={<MembersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
