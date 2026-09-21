import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private tenantsService: TenantsService,
  ) {}

  async upload(
    tenantId: string,
    uploadedById: string,
    file: Express.Multer.File,
  ) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    await this.tenantsService.assertCanStoreBytes(tenantId, tenant.slug, file.size);

    const ext = path.extname(file.originalname);
    const storageKey = `${randomUUID()}${ext}`;
    const mediaDir = this.storage.getMediaDir(tenant.slug);
    fs.writeFileSync(path.join(mediaDir, storageKey), file.buffer);

    return this.prisma.mediaAsset.create({
      data: {
        tenantId,
        fileName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, mediaId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: mediaId, tenantId } });
    if (!asset) {
      throw new NotFoundException('Mediendatei nicht gefunden');
    }
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const filePath = path.join(this.storage.getMediaDir(tenant.slug), asset.storageKey);
    fs.rmSync(filePath, { force: true });
    await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
    return { success: true };
  }

  async getFileStream(tenantId: string, mediaId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: mediaId, tenantId } });
    if (!asset) {
      throw new NotFoundException('Mediendatei nicht gefunden');
    }
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const filePath = path.join(this.storage.getMediaDir(tenant.slug), asset.storageKey);
    return { stream: fs.createReadStream(filePath), asset };
  }
}
