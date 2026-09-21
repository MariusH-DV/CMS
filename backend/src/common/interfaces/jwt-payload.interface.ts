export interface JwtMembership {
  tenantId: string;
  role: 'TENANT_ADMIN' | 'TENANT_USER';
  permissions: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  isSystemAdmin: boolean;
  memberships: JwtMembership[];
}

export interface AuthenticatedUser extends JwtPayload {}
