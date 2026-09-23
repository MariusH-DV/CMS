export type TenantRole = 'TENANT_ADMIN' | 'TENANT_USER';
export type DeviceStatus = 'PENDING' | 'ACTIVE' | 'OFFLINE' | 'DISABLED';
export type ScheduleRecurrence = 'ONCE' | 'DAILY' | 'WEEKLY';

export interface Membership {
  tenantId: string;
  role: TenantRole;
  permissions: string[];
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
  memberships: (Membership & { tenant?: Tenant })[];
}

export interface License {
  id: string;
  tenantId: string;
  maxMonitors: number;
  maxUsers: number;
  maxStorageMb: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  brandingEnabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  storagePath: string;
  active: boolean;
  deactivationReason?: string | null;
  usedStorageBytes?: number;
  createdAt: string;
  license?: License | null;
  _count?: { devices: number; memberships: number };
}

export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  permissions: string[];
  user: { id: string; email: string; firstName: string; lastName: string; active: boolean };
}

export interface Device {
  id: string;
  tenantId: string | null;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  ipAddress: string | null;
  playlistId: string | null;
  playlist?: Playlist | null;
  createdAt: string;
}

export interface DeviceStatusInfo {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  online: boolean;
  uptimeSeconds: number | null;
  cpuLoadPercent: number | null;
  memUsedPercent: number | null;
  diskUsedPercent: number | null;
  gpuAvailable: boolean;
  gpuTempC: number | null;
  playerVersion: string | null;
}

export interface MediaAsset {
  id: string;
  tenantId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaAssetId: string;
  order: number;
  durationSeconds: number;
  mediaAsset: MediaAsset;
}

export interface Playlist {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  items: PlaylistItem[];
}

export interface Schedule {
  id: string;
  tenantId: string;
  playlistId: string;
  deviceId: string;
  startAt: string;
  endAt: string | null;
  recurrence: ScheduleRecurrence;
  priority: number;
  playlist?: Playlist;
  device?: Device;
}

export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  DEVICES_MANAGE: 'devices.manage',
  MEDIA_MANAGE: 'media.manage',
  PLAYLISTS_MANAGE: 'playlists.manage',
  SCHEDULES_MANAGE: 'schedules.manage',
  TENANT_SETTINGS_MANAGE: 'tenant.settings.manage',
} as const;
