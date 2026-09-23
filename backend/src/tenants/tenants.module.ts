import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantExpiryScheduler } from './tenant-expiry.scheduler';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [TenantsService, TenantExpiryScheduler],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
