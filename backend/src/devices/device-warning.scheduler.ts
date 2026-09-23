import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// Erneute Warnung fuer dasselbe Geraet fruehestens nach 6 Stunden, damit eine
// dauerhaft ueberschrittene Grenze nicht alle 5 Minuten eine neue Mail ausloest.
const WARNING_RESEND_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Prueft periodisch die zuletzt per Heartbeat gemeldete CPU-/RAM-/
 * Speicherauslastung sowie GPU-Temperatur von Leihgeraeten gegen die vom
 * System-Admin je Metrik gesetzte Warngrenze und verschickt bei
 * Ueberschreitung irgendeiner davon eine gemeinsame Mail.
 */
@Injectable()
export class DeviceWarningScheduler {
  private readonly logger = new Logger(DeviceWarningScheduler.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkThresholds() {
    const devices = await this.prisma.device.findMany({
      where: {
        isLoaner: true,
        OR: [
          { cpuWarningThresholdPercent: { not: null } },
          { ramWarningThresholdPercent: { not: null } },
          { diskWarningThresholdPercent: { not: null } },
          { gpuWarningThresholdC: { not: null } },
        ],
      },
      include: { tenant: { select: { name: true } } },
    });

    let warnedCount = 0;
    for (const device of devices) {
      const breaches: string[] = [];
      if (
        device.cpuWarningThresholdPercent != null &&
        device.cpuLoadPercent != null &&
        device.cpuLoadPercent >= device.cpuWarningThresholdPercent
      ) {
        breaches.push(`CPU ${device.cpuLoadPercent.toFixed(0)}% (Grenze ${device.cpuWarningThresholdPercent}%)`);
      }
      if (
        device.ramWarningThresholdPercent != null &&
        device.memUsedPercent != null &&
        device.memUsedPercent >= device.ramWarningThresholdPercent
      ) {
        breaches.push(`RAM ${device.memUsedPercent.toFixed(0)}% (Grenze ${device.ramWarningThresholdPercent}%)`);
      }
      if (
        device.diskWarningThresholdPercent != null &&
        device.diskUsedPercent != null &&
        device.diskUsedPercent >= device.diskWarningThresholdPercent
      ) {
        breaches.push(
          `Speicher ${device.diskUsedPercent.toFixed(0)}% (Grenze ${device.diskWarningThresholdPercent}%)`,
        );
      }
      if (
        device.gpuWarningThresholdC != null &&
        device.gpuTempC != null &&
        device.gpuTempC >= device.gpuWarningThresholdC
      ) {
        breaches.push(`GPU ${device.gpuTempC.toFixed(0)}°C (Grenze ${device.gpuWarningThresholdC}°C)`);
      }
      if (breaches.length === 0) continue;

      const canResend =
        !device.warningLastSentAt ||
        Date.now() - device.warningLastSentAt.getTime() >= WARNING_RESEND_INTERVAL_MS;
      if (!canResend) continue;

      const tenantLabel = device.tenant?.name ?? 'nicht zugeordnet';
      // eslint-disable-next-line no-await-in-loop
      const sent = await this.mailService.sendAlert(
        `Warngrenze ueberschritten: ${device.name}`,
        `Das Leihgeraet "${device.name}" (Mandant: ${tenantLabel}) hat folgende Warngrenze(n) ueberschritten: ${breaches.join(', ')}.`,
      );
      if (sent) {
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.device.update({
          where: { id: device.id },
          data: { warningLastSentAt: new Date() },
        });
        warnedCount += 1;
      }
    }

    if (warnedCount > 0) {
      this.logger.log(`${warnedCount} Warn-Mail(s) wegen ueberschrittener Geraete-Grenzwerte verschickt`);
    }
  }
}
