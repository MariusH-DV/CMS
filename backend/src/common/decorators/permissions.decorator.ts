import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Erfordert, dass der Benutzer im Mandanten (Route-Param `tenantId`) System-Admin,
 * Mandant-Admin oder eine der angegebenen granularen Berechtigungen besitzt.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const SYSTEM_ADMIN_ONLY_KEY = 'systemAdminOnly';

/** Erfordert System-Admin-Rechte (globale Verwaltung). */
export const SystemAdminOnly = () => SetMetadata(SYSTEM_ADMIN_ONLY_KEY, true);
