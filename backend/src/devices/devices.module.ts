import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { PublicDevicesController } from './public-devices.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  providers: [DevicesService],
  controllers: [DevicesController, PublicDevicesController],
  exports: [DevicesService],
})
export class DevicesModule {}
