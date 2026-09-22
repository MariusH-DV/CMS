import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  SYSTEM_ADMIN_ONLY_KEY,
  TENANT_MEMBERSHIP_KEY,
} from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Prueft System-Admin- / Mandant-Admin- / granulare Berechtigungen.
 * Der Mandant wird aus dem Route-Parameter `tenantId` (oder ersatzweise `id`) gelesen.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const systemAdminOnly = this.reflector.getAllAndOverride<boolean>(SYSTEM_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requireTenantMembership = this.reflector.getAllAndOverride<boolean>(TENANT_MEMBERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (
      !systemAdminOnly &&
      !requireTenantMembership &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Nicht authentifiziert');
    }

    if (user.isSystemAdmin) {
      return true;
    }

    if (systemAdminOnly) {
      throw new ForbiddenException('Nur fuer System-Admin verfuegbar');
    }

    const tenantId: string | undefined = request.params?.tenantId ?? request.params?.id;
    if (!tenantId) {
      throw new ForbiddenException('Mandant konnte nicht ermittelt werden');
    }

    const membership = user.memberships?.find((m) => m.tenantId === tenantId);
    if (!membership) {
      throw new ForbiddenException('Kein Zugriff auf diesen Mandanten');
    }

    if (membership.role === 'TENANT_ADMIN' || requireTenantMembership) {
      return true;
    }

    const hasPermission = requiredPermissions.some((perm) => membership.permissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException('Fehlende Berechtigung: ' + requiredPermissions.join(', '));
    }

    return true;
  }
}
