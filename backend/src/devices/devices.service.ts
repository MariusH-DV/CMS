import {
  BadRequestException,
  ForbiddenException,
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
import { PlayerDistributionService } from '../player-distribution/player-distribution.service';

// Player sendet alle 30s einen Heartbeat - 90s Toleranz fuer einen einzelnen
// verpassten/verzoegerten Heartbeat, bevor ein Geraet als offline gilt.
const DEVICE_ONLINE_THRESHOLD_MS = 90 * 1000;

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private tenantsService: TenantsService,
    private brandingService: BrandingService,
    private playerDistributionService: PlayerDistributionService,
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
    const devices = await this.prisma.device.findMany({
      where: { tenantId },
      // Explizite Auswahl statt include/voller Objektrueckgabe: apiToken, pin
      // und vor allem lockPin duerfen nie an den Mandanten-Kunden gehen - sonst
      // koennte er sich selbst entsperren und die Vor-Ort-PIN-Sperre waere wirkungslos.
      select: {
        id: true,
        tenantId: true,
        name: true,
        status: true,
        lastSeenAt: true,
        ipAddress: true,
        playlistId: true,
        playlist: true,
        createdAt: true,
        isLoaner: true,
        locked: true,
        playerVersion: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Manueller Update-Button (ersetzt den frueheren automatischen
    // 10-Minuten-Timer) soll nur angezeigt werden, wenn tatsaechlich eine
    // andere Version verfuegbar ist.
    const latestVersion = this.playerDistributionService.getVersion();
    return devices.map((d) => ({ ...d, updateAvailable: d.playerVersion !== latestVersion }));
  }

  async update(tenantId: string, deviceId: string, data: { name?: string; playlistId?: string | null }) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    return this.prisma.device.update({ where: { id: deviceId }, data });
  }

  /** Vom Mandanten-Admin angefordertes Player-Update fuer ein einzelnes Geraet. */
  async requestUpdate(tenantId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    await this.prisma.device.update({ where: { id: deviceId }, data: { updateRequested: true } });
    return { success: true };
  }

  async remove(tenantId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    if (device.isLoaner) {
      throw new ForbiddenException(
        'Dieses Geraet ist ein Leihgeraet und kann nicht entfernt werden. Bitte wende dich an den Anbieter.',
      );
    }
    await this.prisma.device.delete({ where: { id: deviceId } });
    return { success: true };
  }

  /** System-Admin darf jedes Geraet loeschen, auch Leihgeraete - im Gegensatz zu remove() (Kunden-Ansicht). */
  async removeAsAdmin(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    await this.prisma.device.delete({ where: { id: deviceId } });
    return { success: true };
  }

  /**
   * Alle Geraete mandantenuebergreifend fuer das System-Admin-Dashboard.
   * Liefert bewusst KEIN lockPin mit aus - das wird nur einmalig direkt aus
   * lockDevice() zurueckgegeben, damit es nicht dauerhaft ueber die Liste
   * abrufbar ist.
   */
  async listAllForAdmin() {
    return this.prisma.device.findMany({
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
        gpuMemMb: true,
        playerVersion: true,
        isLoaner: true,
        cpuWarningThresholdPercent: true,
        ramWarningThresholdPercent: true,
        diskWarningThresholdPercent: true,
        gpuWarningThresholdC: true,
        locked: true,
        tenant: { select: { id: true, name: true } },
      },
      orderBy: [{ isLoaner: 'desc' }, { name: 'asc' }],
    });
  }

  async updateAdminSettings(
    deviceId: string,
    data: {
      isLoaner?: boolean;
      cpuWarningThresholdPercent?: number | null;
      ramWarningThresholdPercent?: number | null;
      diskWarningThresholdPercent?: number | null;
      gpuWarningThresholdC?: number | null;
    },
  ) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    return this.prisma.device.update({
      where: { id: deviceId },
      data,
      // Wie listAllForAdmin(): kein lockPin/apiToken/pin in der Antwort.
      select: {
        id: true,
        name: true,
        status: true,
        isLoaner: true,
        cpuWarningThresholdPercent: true,
        ramWarningThresholdPercent: true,
        diskWarningThresholdPercent: true,
        gpuWarningThresholdC: true,
        locked: true,
      },
    });
  }

  /** Fordert das Herunterfahren eines Leihgeraets an - wird beim naechsten Heartbeat ausgeliefert. */
  async requestShutdown(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    if (!device.isLoaner) {
      throw new BadRequestException('Herunterfahren ist nur fuer Leihgeraete moeglich');
    }
    await this.prisma.device.update({ where: { id: deviceId }, data: { shutdownRequested: true } });
    return { success: true };
  }

  /**
   * Sperrt ein Leihgeraet und erzeugt eine neue Vor-Ort-Entsperr-PIN. Es gibt
   * absichtlich keine Remote-Entsperrung - die PIN muss direkt am Geraet
   * eingegeben werden (siehe unlockDevice()).
   */
  async lockDevice(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Geraet nicht gefunden');
    }
    if (!device.isLoaner) {
      throw new BadRequestException('Sperren ist nur fuer Leihgeraete moeglich');
    }
    const lockPin = this.generatePin();
    await this.prisma.device.update({ where: { id: deviceId }, data: { locked: true, lockPin } });
    return { success: true, lockPin };
  }

  /** Vom Player aufgerufen, wenn vor Ort auf dem Geraet eine PIN zur Entsperrung eingegeben wird. */
  async unlockDevice(apiToken: string, pin: string) {
    const device = await this.authenticateDevice(apiToken);
    if (!device.locked) {
      return { success: true };
    }
    if (!device.lockPin || device.lockPin !== pin) {
      throw new BadRequestException('Falsche PIN');
    }
    await this.prisma.device.update({ where: { id: device.id }, data: { locked: false, lockPin: null } });
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
    // Vor dem Update gemerkt, weil das Update selbst shutdownRequested/
    // updateRequested sofort zuruecksetzt - der Player soll den jeweiligen
    // Befehl aber genau ein Mal (in dieser Antwort) sehen, unabhaengig davon,
    // ob er dann tatsaechlich gelingt (schlaegt er fehl, kann er einfach
    // erneut angestossen werden).
    const wasShutdownRequested = device.shutdownRequested;
    const wasUpdateRequested = device.updateRequested;
    const updated = await this.prisma.device.update({
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
        playerVersion: metrics?.playerVersion,
        shutdownRequested: false,
        updateRequested: false,
      },
      // Bewusst kein voller Objekt-Rueckgabewert (frueher der Fall): apiToken,
      // pin und vor allem lockPin duerfen nicht an den Player zurueckgehen -
      // sonst koennte sich ein gesperrtes Geraet die Entsperr-PIN selbst
      // "vorlesen" statt dass sie vor Ort von Hand eingegeben werden muss.
      select: {
        tenantId: true,
        locked: true,
        // Der Player uebernimmt den Namen des tatsaechlich zugeordneten
        // Mandanten aus der Antwort - der Name im lokal auf dem Pi
        // gespeicherten player-config.json ist nur der Stand zum Zeitpunkt
        // der Paket-Erzeugung und kann vom Mandanten abweichen, dem das
        // Geraet spaeter tatsaechlich per PIN zugeordnet wurde.
        tenant: { select: { name: true } },
      },
    });
    return { ...updated, shutdownRequested: wasShutdownRequested, updateRequested: wasUpdateRequested };
  }

  /** Reduzierter Geraete-Status fuer die Mandanten-Uebersicht (keine sensiblen Felder wie apiToken). */
  async getStatusForTenant(tenantId: string) {
    const devices = await this.prisma.device.findMany({
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
        playerVersion: true,
        isLoaner: true,
        locked: true,
      },
      orderBy: { name: 'asc' },
    });
    // "online" hier serverseitig mit der Server-Uhrzeit berechnen statt dem
    // Frontend einen rohen Zeitstempel zu geben, den es gegen die eigene
    // (moeglicherweise abweichende) Client-Uhr vergleichen muesste - das hat
    // bereits einmal zu einem falschen "offline" durch eine vorgehende
    // Laptop-Uhr gefuehrt.
    const now = Date.now();
    return devices.map((d) => ({
      ...d,
      online: d.lastSeenAt ? now - d.lastSeenAt.getTime() < DEVICE_ONLINE_THRESHOLD_MS : false,
    }));
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

    if (device.locked) {
      return { source: 'locked', playlist: null };
    }

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
