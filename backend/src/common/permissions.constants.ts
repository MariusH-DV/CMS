/** Granulare Berechtigungs-Keys, die einem Mandant-User individuell zugeteilt werden koennen. */
export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  DEVICES_MANAGE: 'devices.manage',
  MEDIA_MANAGE: 'media.manage',
  PLAYLISTS_MANAGE: 'playlists.manage',
  SCHEDULES_MANAGE: 'schedules.manage',
  TENANT_SETTINGS_MANAGE: 'tenant.settings.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);
