import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { MediaModule } from './media/media.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { BrandingModule } from './branding/branding.module';
import { PlayerDistributionModule } from './player-distribution/player-distribution.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    DevicesModule,
    MediaModule,
    PlaylistsModule,
    SchedulesModule,
    ProvisioningModule,
    BrandingModule,
    PlayerDistributionModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
