import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpsertLicenseDto } from './dto/upsert-license.dto';
import {
  SystemAdminOnly,
  RequirePermissions,
  RequireTenantMembership,
  AllowWhenTenantInactive,
} from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @SystemAdminOnly()
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @SystemAdminOnly()
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  // Lesend: jedes Mandanten-Mitglied darf die Basisdaten (fuer die
  // Uebersichtsseite) sehen, nicht nur wer explizit TENANT_SETTINGS_MANAGE hat.
  // Bleibt auch bei deaktiviertem Mandanten erreichbar - genau das ist die
  // Seite, die den Deaktivierungs-Hinweis anzeigt.
  @RequireTenantMembership()
  @AllowWhenTenantInactive()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.TENANT_SETTINGS_MANAGE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @SystemAdminOnly()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @SystemAdminOnly()
  @Put(':id/license')
  upsertLicense(@Param('id') id: string, @Body() dto: UpsertLicenseDto) {
    return this.tenantsService.upsertLicense(id, dto);
  }
}
