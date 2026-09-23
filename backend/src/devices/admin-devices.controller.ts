import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { UpdateAdminDeviceDto } from './dto/update-admin-device.dto';
import { SystemAdminOnly } from '../common/decorators/permissions.decorator';

/** Mandantenuebergreifende Geraeteverwaltung fuer den System-Admin (Leihgeraete/Kundengeraete). */
@SystemAdminOnly()
@Controller('admin/devices')
export class AdminDevicesController {
  constructor(private devicesService: DevicesService) {}

  @Get()
  list() {
    return this.devicesService.listAllForAdmin();
  }

  @Patch(':deviceId')
  update(@Param('deviceId') deviceId: string, @Body() dto: UpdateAdminDeviceDto) {
    return this.devicesService.updateAdminSettings(deviceId, dto);
  }

  @Post(':deviceId/shutdown')
  shutdown(@Param('deviceId') deviceId: string) {
    return this.devicesService.requestShutdown(deviceId);
  }

  @Post(':deviceId/lock')
  lock(@Param('deviceId') deviceId: string) {
    return this.devicesService.lockDevice(deviceId);
  }
}
