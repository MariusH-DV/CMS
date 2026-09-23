import { Module } from '@nestjs/common';
import { PlayerDistributionService } from './player-distribution.service';
import { PlayerDistributionController } from './player-distribution.controller';

@Module({
  providers: [PlayerDistributionService],
  controllers: [PlayerDistributionController],
})
export class PlayerDistributionModule {}
