import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { ClaimDeviceDto } from './dto/claim-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { RequirePermissions, RequireTenantMembership } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

/** Geraeteverwaltung innerhalb eines Mandanten. */
@Controller('tenants/:tenantId/devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.devicesService.listForTenant(tenantId);
  }

  // Reduzierter Status (kein apiToken etc.) fuer die Uebersichtsseite - dort
  // darf jedes Mandanten-Mitglied Uptime/Auslastung sehen, nicht nur wer
  // DEVICES_MANAGE hat.
  @RequireTenantMembership()
  @Get('status')
  status(@Param('tenantId') tenantId: string) {
    return this.devicesService.getStatusForTenant(tenantId);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Post('claim')
  claim(@Param('tenantId') tenantId: string, @Body() dto: ClaimDeviceDto) {
    return this.devicesService.claimDevice(tenantId, dto);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Patch(':deviceId')
  update(
    @Param('tenantId') tenantId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(tenantId, deviceId, dto);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Delete(':deviceId')
  remove(@Param('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.devicesService.remove(tenantId, deviceId);
  }

  // Ersetzt den frueheren automatischen 10-Minuten-Update-Timer auf dem Pi:
  // der Mandant stoesst das Update gezielt fuer ein einzelnes Geraet an,
  // wenn eine neue Version verfuegbar ist (siehe listForTenant()/updateAvailable).
  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Post(':deviceId/update')
  requestUpdate(@Param('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.devicesService.requestUpdate(tenantId, deviceId);
  }
}
