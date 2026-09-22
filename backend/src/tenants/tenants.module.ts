import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantExpiryScheduler } from './tenant-expiry.scheduler';

@Module({
  providers: [TenantsService, TenantExpiryScheduler],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
