import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
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
  @Public()
  @Get('logo')
  async serve(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const logo = await this.brandingService.getLogoByTenantId(tenantId);
    if (!logo) {
      throw new NotFoundException('Kein Logo hinterlegt');
    }
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    fs.createReadStream(logo.path).pipe(res);
  }
}
