import { Module } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';

@Module({
  providers: [BrandingService],
  controllers: [BrandingController],
  exports: [BrandingService],
})
export class BrandingModule {}
