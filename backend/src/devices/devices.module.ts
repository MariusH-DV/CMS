import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { AdminDevicesController } from './admin-devices.controller';
import { PublicDevicesController } from './public-devices.controller';
import { DeviceWarningScheduler } from './device-warning.scheduler';
import { TenantsModule } from '../tenants/tenants.module';
import { BrandingModule } from '../branding/branding.module';
import { MailModule } from '../mail/mail.module';
import { PlayerDistributionModule } from '../player-distribution/player-distribution.module';

@Module({
  imports: [TenantsModule, BrandingModule, MailModule, PlayerDistributionModule],
  providers: [DevicesService, DeviceWarningScheduler],
  controllers: [DevicesController, AdminDevicesController, PublicDevicesController],
  exports: [DevicesService],
})
export class DevicesModule {}
