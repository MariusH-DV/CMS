import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import archiver from 'archiver';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratePackageDto } from './dto/generate-package.dto';

const REPO_ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(__dirname, '../../../');

const TEMPLATES_DIR = path.join(REPO_ROOT, 'pi-image', 'templates');
const PLAYER_DIR = path.join(REPO_ROOT, 'player');

function renderTemplate(templateName: string, vars: Record<string, string>): string {
  const raw = fs.readFileSync(path.join(TEMPLATES_DIR, templateName), 'utf-8');
  return raw.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? '');
}

@Injectable()
export class ProvisioningService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Erstellt ein ZIP-Bereitstellungspaket fuer einen Raspberry Pi:
   * WLAN-Zugangsdaten, Player-App, Autostart-Dienste und eine Installationsanleitung.
   * Die eigentliche Geraete-Registrierung erfolgt weiterhin ueber die PIN, die der
   * Player beim ersten Start anzeigt - dieses Paket enthaelt bewusst keinen Token.
   */
  async buildPackage(tenantId: string, dto: GeneratePackageDto): Promise<archiver.Archiver> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden');
    }
    if (!fs.existsSync(PLAYER_DIR)) {
      throw new NotFoundException(
        `Player-Quellcode wurde nicht gefunden (${PLAYER_DIR}). REPO_ROOT pruefen.`,
      );
    }

    // WLAN wird bei aktuellen Raspberry Pi OS Versionen meist bereits direkt im
    // Raspberry Pi Imager eingerichtet (siehe cloud-init-Ablauf). Die Angabe im
    // CMS ist daher optional - nur wenn beides gesetzt ist, legen wir zusaetzlich
    // wpa_supplicant.conf/nm-wifi.conf als Fallback bei (z.B. fuer Option B).
    const hasWifi = Boolean(dto.ssid && dto.wifiPassword);

    const vars = {
      SSID: dto.ssid ?? '',
      WIFI_PASSWORD: dto.wifiPassword ?? '',
      API_URL: this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000/api',
      TENANT_ID: tenantId,
      TENANT_NAME: tenant.name,
      DEVICE_LABEL: dto.deviceLabel ?? tenant.name,
      NM_UUID: randomUUID(),
    };

    const archive = archiver('zip', { zlib: { level: 9 } });

    if (hasWifi) {
      archive.append(renderTemplate('wpa_supplicant.conf.tpl', vars), {
        name: 'cms-provisioning/wpa_supplicant.conf',
      });
      archive.append(renderTemplate('nm-wifi.conf.tpl', vars), {
        name: 'cms-provisioning/nm-wifi.conf',
      });
    }
    archive.append(renderTemplate('player-config.json.tpl', vars), {
      name: 'cms-provisioning/player-config.json',
    });
    archive.append(renderTemplate('cms-player.service.tpl', vars), {
      name: 'cms-provisioning/cms-player.service',
    });
    archive.append(renderTemplate('cms-kiosk.service.tpl', vars), {
      name: 'cms-provisioning/cms-kiosk.service',
    });
    archive.append(renderTemplate('install.sh.tpl', vars), {
      name: 'cms-provisioning/install.sh',
      mode: 0o755,
    });
    archive.append(renderTemplate('README.md.tpl', vars), {
      name: 'cms-provisioning/README.md',
    });
    archive.append(renderTemplate('userdata-append.txt.tpl', vars), {
      name: 'cms-provisioning/userdata-append.txt',
    });

    archive.directory(PLAYER_DIR, 'cms-provisioning/player', (entry) => {
      if (entry.name.startsWith('node_modules') || entry.name.startsWith('dist')) {
        return false;
      }
      return entry;
    });

    archive.finalize();
    return archive;
  }
}
