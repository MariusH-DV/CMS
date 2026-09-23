import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const EXT_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function mimeTypeForExt(ext: string): string {
  return EXT_MIME_TYPES[ext.toLowerCase()] ?? 'application/octet-stream';
}

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
    for (const sub of ['media', 'provisioning', 'branding']) {
      fs.mkdirSync(path.join(tenantRoot, sub), { recursive: true });
    }
    return tenantRoot;
  }

  getMediaDir(slug: string): string {
    const dir = path.join(this.getTenantRoot(slug), 'media');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getBrandingDir(slug: string): string {
    const dir = path.join(this.getTenantRoot(slug), 'branding');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Ueberschreibt das Branding-Logo eines Mandanten (entfernt vorherige Dateien mit anderer Endung). */
  saveBrandingLogo(slug: string, buffer: Buffer, ext: string): { fileName: string; mimeType: string } {
    const dir = this.getBrandingDir(slug);
    this.removeBrandingLogo(slug);
    const fileName = `logo${ext}`;
    fs.writeFileSync(path.join(dir, fileName), buffer);
    return { fileName, mimeType: mimeTypeForExt(ext) };
  }

  /** Liefert Pfad + MIME-Type des Branding-Logos, falls eines hinterlegt ist. */
  getBrandingLogo(slug: string): { path: string; mimeType: string } | null {
    const dir = this.getBrandingDir(slug);
    const entry = fs.readdirSync(dir).find((f) => f.startsWith('logo.'));
    if (!entry) return null;
    return { path: path.join(dir, entry), mimeType: mimeTypeForExt(path.extname(entry)) };
  }

  removeBrandingLogo(slug: string): void {
    const dir = this.getBrandingDir(slug);
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith('logo.')) {
        fs.rmSync(path.join(dir, entry), { force: true });
      }
    }
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
