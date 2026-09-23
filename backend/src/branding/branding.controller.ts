import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BrandingService } from './branding.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';
import { Public } from '../common/decorators/public.decorator';

@Controller('tenants/:tenantId/branding')
export class BrandingController {
  constructor(private brandingService: BrandingService) {}

  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_MANAGE)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('tenantId') tenantId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.brandingService.uploadLogo(tenantId, file);
  }

  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_MANAGE)
  @Delete('logo')
  remove(@Param('tenantId') tenantId: string) {
    return this.brandingService.removeLogo(tenantId);
  }

  // Oeffentlich, damit ein <img src="..."> in der Sidebar ohne JWT laden kann
  // (gleiches Muster wie das Medien-Streaming in MediaController).
  //
  // "no-cache" statt einer festen max-age-Dauer: der Browser MUSS bei jedem
  // Laden erneut beim Server nachfragen (per ETag/Last-Modified, die
  // res.sendFile automatisch setzt), statt eine evtl. laengst veraltete
  // Kopie zu zeigen - wichtig, weil sich das Logo (Neu-Upload) oder die
  // Sichtbarkeit (Branding-Lizenz entzogen -> 404) sich jederzeit aendern
  // kann. res.sendFile() antwortet dann selbst mit 304, wenn sich am Inhalt
  // nichts geaendert hat - kein unnoetiger erneuter Download.
  @Public()
  @Get('logo')
  async serve(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const logo = await this.brandingService.getLogoByTenantId(tenantId);
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(logo.path);
  }
}
