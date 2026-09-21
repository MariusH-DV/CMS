import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Verwaltet die getrennte Ordnerstruktur je Mandant auf dem Dateisystem:
 * <STORAGE_ROOT>/<tenant-slug>/media
 * <STORAGE_ROOT>/<tenant-slug>/provisioning
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private config: ConfigService) {
    this.root = path.resolve(this.config.get<string>('STORAGE_ROOT') ?? './storage/tenants');
    fs.mkdirSync(this.root, { recursive: true });
  }

  getTenantRoot(slug: string): string {
    return path.join(this.root, slug);
  }

  createTenantFolders(slug: string): string {
    const tenantRoot = this.getTenantRoot(slug);
    for (const sub of ['media', 'provisioning']) {
      fs.mkdirSync(path.join(tenantRoot, sub), { recursive: true });
    }
    return tenantRoot;
  }

  getMediaDir(slug: string): string {
    const dir = path.join(this.getTenantRoot(slug), 'media');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getProvisioningDir(slug: string): string {
    const dir = path.join(this.getTenantRoot(slug), 'provisioning');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Summiert die Groesse aller Dateien im Media-Ordner eines Mandanten (Bytes). */
  getMediaFolderSizeBytes(slug: string): number {
    const dir = this.getMediaDir(slug);
    let total = 0;
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        total += stat.size;
      }
    }
    return total;
  }

  removeTenantFolders(slug: string): void {
    const tenantRoot = this.getTenantRoot(slug);
    fs.rmSync(tenantRoot, { recursive: true, force: true });
  }
}
