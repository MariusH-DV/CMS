import { BadRequestException, Body, Controller, Get, Put, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { UpdateMailSettingsDto } from './dto/update-mail-settings.dto';
import { SendTestMailDto } from './dto/send-test-mail.dto';
import { SystemAdminOnly } from '../common/decorators/permissions.decorator';

/** SMTP-Einstellungen fuer kritische Meldungen (Warngrenzen, Lizenzablauf) - nur System-Admin. */
@SystemAdminOnly()
@Controller('admin/mail-settings')
export class MailController {
  constructor(private mailService: MailService) {}

  // Das gespeicherte Passwort wird nie im Klartext an den Browser
  // zurueckgegeben, nur ob eines hinterlegt ist - weder beim Lesen noch als
  // Echo nach dem Speichern.
  private mask(settings: { password?: string | null } & Record<string, unknown>) {
    const { password, ...rest } = settings;
    return { ...rest, passwordSet: Boolean(password) };
  }

  @Get()
  async get() {
    const settings = await this.mailService.getSettings();
    if (!settings) {
      return { enabled: false, port: 587, secure: false, passwordSet: false };
    }
    return this.mask(settings);
  }

  @Put()
  async update(@Body() dto: UpdateMailSettingsDto) {
    const settings = await this.mailService.updateSettings(dto);
    return this.mask(settings);
  }

  @Post('test')
  async test(@Body() dto: SendTestMailDto) {
    try {
      await this.mailService.sendTestMail(dto.to);
      return { success: true };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
