import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

/**
 * Verwaltet das pro-Mandant hinterlegte Branding-Logo. Nur nutzbar, wenn die
 * Zusatzlizenz "Branding" (License.brandingEnabled) freigeschaltet ist.
 */
@Injectable()
export class BrandingService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async getTenantWithLicense(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { license: true },
    });
    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden');
    }
    return tenant;
  }

  async uploadLogo(tenantId: string, file?: Express.Multer.File) {
    const tenant = await this.getTenantWithLicense(tenantId);
    if (!tenant.license?.brandingEnabled) {
      throw new ForbiddenException('Branding ist fuer diesen Mandanten nicht freigeschaltet');
    }
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Nur Bilddateien (PNG, JPG, WEBP oder SVG) erlaubt');
    }
    this.storage.saveBrandingLogo(tenant.slug, file.buffer, ext);
    return { success: true };
  }

  async removeLogo(tenantId: string) {
    const tenant = await this.getTenantWithLicense(tenantId);
    this.storage.removeBrandingLogo(tenant.slug);
    return { success: true };
  }

  /** Fuer die Web-Oberflaeche (Sidebar): oeffentlich per tenantId abrufbar, wie beim Medien-Streaming. */
  async getLogoByTenantId(tenantId: string) {
    const tenant = await this.getTenantWithLicense(tenantId);
    if (!tenant.license?.brandingEnabled) {
      throw new NotFoundException('Branding nicht freigeschaltet');
    }
    const logo = this.storage.getBrandingLogo(tenant.slug);
    if (!logo) {
      throw new NotFoundException('Kein Logo hinterlegt');
    }
    return logo;
  }

  /** Fuer den Pi-Player: Zugriff bereits durch das Geraete-Token in DevicesService geprueft. */
  async getLogoForSlugIfEnabled(slug: string, brandingEnabled: boolean) {
    if (!brandingEnabled) {
      return null;
    }
    return this.storage.getBrandingLogo(slug);
  }
}
