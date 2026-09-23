import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// Erneute Warnung fuer dasselbe Geraet fruehestens nach 6 Stunden, damit eine
// dauerhaft ueberschrittene Grenze nicht alle 5 Minuten eine neue Mail ausloest.
const WARNING_RESEND_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Prueft periodisch die zuletzt per Heartbeat gemeldete CPU-/RAM-/
 * Speicherauslastung von Leihgeraeten gegen die vom System-Admin gesetzte
 * Warngrenze und verschickt bei Ueberschreitung eine Mail.
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
      where: { isLoaner: true, warningThresholdPercent: { not: null } },
      include: { tenant: { select: { name: true } } },
    });

    let warnedCount = 0;
    for (const device of devices) {
      const threshold = device.warningThresholdPercent;
      if (threshold == null) continue;

      const breaches: string[] = [];
      if (device.cpuLoadPercent != null && device.cpuLoadPercent >= threshold) {
        breaches.push(`CPU ${device.cpuLoadPercent.toFixed(0)}%`);
      }
      if (device.memUsedPercent != null && device.memUsedPercent >= threshold) {
        breaches.push(`RAM ${device.memUsedPercent.toFixed(0)}%`);
      }
      if (device.diskUsedPercent != null && device.diskUsedPercent >= threshold) {
        breaches.push(`Speicher ${device.diskUsedPercent.toFixed(0)}%`);
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
        `Das Leihgeraet "${device.name}" (Mandant: ${tenantLabel}) hat die Warngrenze von ${threshold}% ueberschritten: ${breaches.join(', ')}.`,
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
