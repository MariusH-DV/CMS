import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { PairingRequestDto } from './dto/pairing-request.dto';
import { ClaimDeviceDto } from './dto/claim-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private tenantsService: TenantsService,
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /** Wird vom Player beim ersten Start (unregistriert) aufgerufen. */
  async requestPairing(dto: PairingRequestDto) {
    let device = await this.prisma.device.findUnique({ where: { hardwareId: dto.hardwareId } });

    if (device && device.status === 'ACTIVE' && device.apiToken) {
      // Bereits registriert (z.B. Player-Neustart) -> Token direkt zurueckgeben
      return { deviceId: device.id, status: device.status, apiToken: device.apiToken };
    }

    let pin = this.generatePin();
    // Eindeutigkeit sicherstellen
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.device.findUnique({ where: { pin } })) {
      pin = this.generatePin();
    }

    const pinExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (device) {
      device = await this.prisma.device.update({
        where: { id: device.id },
        data: { pin, pinExpiresAt, status: 'PENDING', apiToken: null, tenantId: null },
      });
    } else {
      device = await this.prisma.device.create({
        data: {
          hardwareId: dto.hardwareId,
          name: dto.name ?? 'Neuer Raspberry Pi',
          pin,
          pinExpiresAt,
          status: 'PENDING',
        },
      });
    }

    return { deviceId: device.id, pin: device.pin, status: device.status };
  }

  /** Wird vom Player gepollt, waehrend die PIN angezeigt wird. */
  async getPairingStatus(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    if (device.status === 'ACTIVE' && device.apiToken) {
      return { status: device.status, apiToken: device.apiToken };
    }
    return { status: device.status };
  }

  /** Admin/Mandant-Admin gibt die auf dem Bildschirm angezeigte PIN ein. */
  async claimDevice(tenantId: string, dto: ClaimDeviceDto) {
    await this.tenantsService.assertCanAddDevice(tenantId);

    const device = await this.prisma.device.findUnique({ where: { pin: dto.pin } });
    if (!device || device.status !== 'PENDING') {
      throw new BadRequestException('Ungueltige oder abgelaufene PIN');
    }
    if (device.pinExpiresAt && device.pinExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Diese PIN ist abgelaufen. Bitte Geraet neu starten.');
    }

    const apiToken = this.generateToken();
    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        tenantId,
        name: dto.name,
        status: 'ACTIVE',
        apiToken,
        pin: null,
        pinExpiresAt: null,
      },
    });
  }

  async listForTenant(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId },
      include: { playlist: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, deviceId: string, data: { name?: string; playlistId?: string | null }) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    return this.prisma.device.update({ where: { id: deviceId }, data });
  }

  async remove(tenantId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    await this.prisma.device.delete({ where: { id: deviceId } });
    return { success: true };
  }

  async authenticateDevice(apiToken: string) {
    const device = await this.prisma.device.findUnique({ where: { apiToken } });
    if (!device || device.status !== 'ACTIVE') {
      throw new UnauthorizedException('Ungueltiges Geraete-Token');
    }
    return device;
  }

  async heartbeat(apiToken: string, ipAddress?: string) {
    const device = await this.authenticateDevice(apiToken);
    return this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), ipAddress },
    });
  }

  async getPlaylistForDevice(apiToken: string) {
    const device = await this.authenticateDevice(apiToken);
    const now = new Date();

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        deviceId: device.id,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
      include: { playlist: { include: { items: { include: { mediaAsset: true }, orderBy: { order: 'asc' } } } } },
    });

    if (schedule) {
      return { source: 'schedule', playlist: schedule.playlist };
    }

    if (device.playlistId) {
      const playlist = await this.prisma.playlist.findUnique({
        where: { id: device.playlistId },
        include: { items: { include: { mediaAsset: true }, orderBy: { order: 'asc' } } },
      });
      return { source: 'default', playlist };
    }

    return { source: 'none', playlist: null };
  }
}
