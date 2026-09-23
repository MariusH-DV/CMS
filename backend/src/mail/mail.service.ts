import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Versendet kritische Meldungen (Warngrenzen bei Leihgeraeten, baldiger
 * Lizenzablauf) per SMTP. Die Einstellungen liegen als Singleton-Zeile in der
 * DB (siehe MailSettings-Model), damit sie ueber das Admin-Dashboard
 * konfigurierbar sind statt fest per Umgebungsvariable. Ist kein/kein
 * vollstaendiger SMTP-Server hinterlegt, wird nur eine Warnung geloggt statt
 * eines Fehlers - der Rest der Anwendung soll davon nicht abhaengen.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.mailSettings.findFirst();
  }

  async updateSettings(data: {
    enabled?: boolean;
    host?: string | null;
    port?: number;
    secure?: boolean;
    username?: string | null;
    password?: string | null;
    fromAddress?: string | null;
    fromName?: string | null;
    alertRecipientEmail?: string | null;
  }) {
    const existing = await this.prisma.mailSettings.findFirst();
    if (existing) {
      return this.prisma.mailSettings.update({ where: { id: existing.id }, data });
    }
    return this.prisma.mailSettings.create({ data });
  }

  private async buildTransport() {
    const settings = await this.getSettings();
    if (!settings || !settings.enabled || !settings.host || !settings.fromAddress) {
      return null;
    }
    return {
      transporter: nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: settings.username ? { user: settings.username, pass: settings.password ?? undefined } : undefined,
      }),
      settings,
    };
  }

  /** Sendet eine kritische Meldung an die hinterlegte Alert-Adresse. Gibt true bei erfolgtem Versand zurueck. */
  async sendAlert(subject: string, text: string): Promise<boolean> {
    const built = await this.buildTransport();
    if (!built) {
      this.logger.warn(`Mailserver nicht konfiguriert - Meldung nicht versendet: "${subject}"`);
      return false;
    }
    const { transporter, settings } = built;
    if (!settings.alertRecipientEmail) {
      this.logger.warn(`Kein Alert-Empfaenger hinterlegt - Meldung nicht versendet: "${subject}"`);
      return false;
    }
    try {
      await transporter.sendMail({
        from: settings.fromName ? `"${settings.fromName}" <${settings.fromAddress}>` : (settings.fromAddress as string),
        to: settings.alertRecipientEmail,
        subject,
        text,
      });
      return true;
    } catch (err) {
      this.logger.error(`Mailversand fehlgeschlagen: ${(err as Error).message}`);
      return false;
    }
  }

  /** Sendet eine Test-Mail an die angegebene Adresse, um die SMTP-Einstellungen zu pruefen. */
  async sendTestMail(toAddress: string): Promise<void> {
    const built = await this.buildTransport();
    if (!built) {
      throw new Error('Mailserver ist nicht vollstaendig konfiguriert oder deaktiviert');
    }
    const { transporter, settings } = built;
    await transporter.sendMail({
      from: settings.fromName ? `"${settings.fromName}" <${settings.fromAddress}>` : (settings.fromAddress as string),
      to: toAddress,
      subject: 'Test-Mail vom Zentrale CMS',
      text: 'Dies ist eine Test-Mail, um die SMTP-Einstellungen zu pruefen. Wenn du sie erhalten hast, funktioniert der Versand.',
    });
  }
}
