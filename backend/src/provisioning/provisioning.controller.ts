import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProvisioningService } from './provisioning.service';
import { GeneratePackageDto } from './dto/generate-package.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

@Controller('tenants/:tenantId/provisioning')
export class ProvisioningController {
  constructor(private provisioningService: ProvisioningService) {}

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Post('package')
  async downloadPackage(
    @Param('tenantId') tenantId: string,
    @Body() dto: GeneratePackageDto,
    @Res() res: Response,
  ) {
    const archive = await this.provisioningService.buildPackage(tenantId, dto);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="cms-provisioning.zip"');
    archive.pipe(res);
  }
}
