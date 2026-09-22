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

export const TENANT_MEMBERSHIP_KEY = 'tenantMembership';

/**
 * Erfordert lediglich Mitgliedschaft im Mandanten (Route-Param `tenantId`
 * oder `id`), unabhaengig von Rolle/granularen Berechtigungen - fuer rein
 * lesende Endpunkte, die jedes Mandanten-Mitglied sehen darf (z.B. die
 * Uebersichtsseite).
 */
export const RequireTenantMembership = () => SetMetadata(TENANT_MEMBERSHIP_KEY, true);

export const ALLOW_WHEN_TENANT_INACTIVE_KEY = 'allowWhenTenantInactive';

/**
 * Erlaubt den Zugriff auch dann, wenn der Mandant deaktiviert wurde - fuer den
 * einen Endpunkt, der die Uebersichtsseite/das "Dashboard" speist (dort wird
 * der Deaktivierungsgrund angezeigt). Alle anderen Mandanten-Endpunkte sind
 * fuer deaktivierte Mandanten gesperrt (ausser fuer System-Admins).
 */
export const AllowWhenTenantInactive = () => SetMetadata(ALLOW_WHEN_TENANT_INACTIVE_KEY, true);
