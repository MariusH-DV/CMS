import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpsertLicenseDto } from './dto/upsert-license.dto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Ein Mandant mit diesem Slug existiert bereits');
    }

    const storagePath = this.storage.createTenantFolders(dto.slug);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        storagePath,
        license: {
          create: {
            maxMonitors: dto.maxMonitors ?? 5,
            maxUsers: dto.maxUsers ?? 5,
            maxStorageMb: dto.maxStorageMb ?? 1024,
          },
        },
      },
      include: { license: true },
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({
      include: { license: true, _count: { select: { devices: true, memberships: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { license: true, _count: { select: { devices: true, memberships: true } } },
    });
    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden');
    }
    const usedStorageBytes = this.storage.getMediaFolderSizeBytes(tenant.slug);
    return { ...tenant, usedStorageBytes };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        active: dto.active,
        // Grund nur setzen, wenn tatsaechlich deaktiviert wird - bei Reaktivierung
        // automatisch loeschen, damit kein veralteter Grund haengen bleibt.
        deactivationReason: dto.active === false ? (dto.deactivationReason ?? null) : dto.active === true ? null : undefined,
      },
    });
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    await this.prisma.tenant.delete({ where: { id } });
    this.storage.removeTenantFolders(tenant.slug);
    return { success: true };
  }

  async upsertLicense(tenantId: string, dto: UpsertLicenseDto) {
    await this.findOne(tenantId);
    return this.prisma.license.upsert({
      where: { tenantId },
      create: {
        tenantId,
        maxMonitors: dto.maxMonitors,
        maxUsers: dto.maxUsers,
        maxStorageMb: dto.maxStorageMb,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        active: dto.active ?? true,
      },
      update: {
        maxMonitors: dto.maxMonitors,
        maxUsers: dto.maxUsers,
        maxStorageMb: dto.maxStorageMb,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        active: dto.active ?? true,
      },
    });
  }

  async getActiveLicense(tenantId: string) {
    const license = await this.prisma.license.findUnique({ where: { tenantId } });
    if (!license || !license.active) {
      throw new ForbiddenException('Fuer diesen Mandanten liegt keine aktive Lizenz vor');
    }
    if (license.validUntil && license.validUntil.getTime() < Date.now()) {
      throw new ForbiddenException('Die Lizenz dieses Mandanten ist abgelaufen');
    }
    return license;
  }

  async assertCanAddDevice(tenantId: string) {
    const license = await this.getActiveLicense(tenantId);
    const count = await this.prisma.device.count({ where: { tenantId } });
    if (count >= license.maxMonitors) {
      throw new BadRequestException(
        `Lizenzlimit erreicht: maximal ${license.maxMonitors} Monitore erlaubt`,
      );
    }
  }

  async assertCanAddUser(tenantId: string) {
    const license = await this.getActiveLicense(tenantId);
    const count = await this.prisma.tenantMembership.count({ where: { tenantId } });
    if (count >= license.maxUsers) {
      throw new BadRequestException(
        `Lizenzlimit erreicht: maximal ${license.maxUsers} Benutzer erlaubt`,
      );
    }
  }

  async assertCanStoreBytes(tenantId: string, slug: string, additionalBytes: number) {
    const license = await this.getActiveLicense(tenantId);
    const currentBytes = this.storage.getMediaFolderSizeBytes(slug);
    const maxBytes = license.maxStorageMb * 1024 * 1024;
    if (currentBytes + additionalBytes > maxBytes) {
      throw new BadRequestException(
        `Speicherlimit erreicht: maximal ${license.maxStorageMb} MB erlaubt`,
      );
    }
  }

  /**
   * Deaktiviert automatisch alle noch aktiven Mandanten, deren Lizenz-Gueltigkeit
   * ("Gueltig bis") bereits abgelaufen ist, und setzt den Deaktivierungsgrund.
   * Wird periodisch vom TenantExpiryScheduler aufgerufen.
   */
  async deactivateExpiredTenants() {
    const expired = await this.prisma.tenant.findMany({
      where: { active: true, license: { validUntil: { lt: new Date() } } },
      select: { id: true },
    });
    if (expired.length === 0) {
      return { deactivatedCount: 0 };
    }
    await this.prisma.tenant.updateMany({
      where: { id: { in: expired.map((t) => t.id) } },
      data: { active: false, deactivationReason: 'Automatisches Vertragsende' },
    });
    return { deactivatedCount: expired.length };
  }
}
