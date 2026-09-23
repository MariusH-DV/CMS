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
import { HeartbeatDto } from './dto/heartbeat.dto';
import { BrandingService } from '../branding/branding.service';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private tenantsService: TenantsService,
    private brandingService: BrandingService,
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

  async heartbeat(apiToken: string, ipAddress?: string, metrics?: HeartbeatDto) {
    const device = await this.authenticateDevice(apiToken);
    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        ipAddress,
        uptimeSeconds: metrics?.uptimeSeconds,
        cpuLoadPercent: metrics?.cpuLoadPercent,
        memUsedPercent: metrics?.memUsedPercent,
        diskUsedPercent: metrics?.diskUsedPercent,
        gpuAvailable: metrics?.gpuAvailable,
        gpuTempC: metrics?.gpuTempC,
        gpuMemMb: metrics?.gpuMemMb,
      },
    });
  }

  /** Reduzierter Geraete-Status fuer die Mandanten-Uebersicht (keine sensiblen Felder wie apiToken). */
  async getStatusForTenant(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        lastSeenAt: true,
        uptimeSeconds: true,
        cpuLoadPercent: true,
        memUsedPercent: true,
        diskUsedPercent: true,
        gpuAvailable: true,
        gpuTempC: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Prueft, ob ein Zeitplan JETZT aktiv sein soll. "recurrence" bestimmt, wie
   * die Uhrzeit-/Datumsangaben aus startAt/endAt interpretiert werden:
   * - ONCE: klassischer absoluter Datumsbereich (startAt..endAt)
   * - DAILY: startAt/endAt geben nur die taegliche Uhrzeit vor (ab dem Datum
   *   von startAt), wiederholt sich jeden Tag
   * - WEEKLY: wie DAILY, zusaetzlich nur am gleichen Wochentag wie startAt
   */
  private isScheduleActive(
    schedule: { startAt: Date; endAt: Date | null; recurrence: string },
    now: Date,
  ): boolean {
    if (schedule.startAt > now) {
      return false;
    }

    if (schedule.recurrence === 'ONCE') {
      return !schedule.endAt || schedule.endAt >= now;
    }

    const startMinutes = schedule.startAt.getHours() * 60 + schedule.startAt.getMinutes();
    const endMinutes = schedule.endAt
      ? schedule.endAt.getHours() * 60 + schedule.endAt.getMinutes()
      : 24 * 60;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes < startMinutes || nowMinutes >= endMinutes) {
      return false;
    }

    if (schedule.recurrence === 'WEEKLY') {
      return now.getDay() === schedule.startAt.getDay();
    }

    return true; // DAILY
  }

  async getPlaylistForDevice(apiToken: string) {
    const device = await this.authenticateDevice(apiToken);

    if (device.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: device.tenantId },
        select: { active: true, deactivationReason: true },
      });
      if (tenant && !tenant.active) {
        return { source: 'deactivated', playlist: null, deactivationReason: tenant.deactivationReason };
      }
    }

    const now = new Date();

    const schedules = await this.prisma.schedule.findMany({
      where: { deviceId: device.id },
      orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
      include: { playlist: { include: { items: { include: { mediaAsset: true }, orderBy: { order: 'asc' } } } } },
    });
    const activeSchedule = schedules.find((s) => this.isScheduleActive(s, now));

    if (activeSchedule) {
      return { source: 'schedule', playlist: activeSchedule.playlist };
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

  /** Liefert das Branding-Logo des Mandanten fuer den Pi-Player, falls Branding freigeschaltet und ein Logo hinterlegt ist. */
  async getLogoForDevice(apiToken: string) {
    const device = await this.authenticateDevice(apiToken);
    if (!device.tenantId) {
      return null;
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: device.tenantId },
      include: { license: true },
    });
    if (!tenant) {
      return null;
    }
    return this.brandingService.getLogoForSlugIfEnabled(tenant.slug, tenant.license?.brandingEnabled ?? false);
  }
}
