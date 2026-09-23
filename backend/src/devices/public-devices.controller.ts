import { Controller, Get, Headers, NotFoundException, Param, Post, Body, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { DevicesService } from './devices.service';
import { PairingRequestDto } from './dto/pairing-request.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Public } from '../common/decorators/public.decorator';

/**
 * Oeffentliche Endpunkte, die vom Raspberry-Pi-Player genutzt werden.
 * Authentifizierung erfolgt ueber das Geraete-Token im Header `x-device-token`
 * (nicht ueber JWT), daher @Public().
 */
@Public()
@Controller('public/devices')
export class PublicDevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post('pairing-request')
  requestPairing(@Body() dto: PairingRequestDto) {
    return this.devicesService.requestPairing(dto);
  }

  @Get('pairing-status/:deviceId')
  pairingStatus(@Param('deviceId') deviceId: string) {
    return this.devicesService.getPairingStatus(deviceId);
  }

  @Get('playlist')
  getPlaylist(@Headers('x-device-token') token?: string) {
    if (!token) {
      throw new UnauthorizedException('x-device-token Header fehlt');
    }
    return this.devicesService.getPlaylistForDevice(token);
  }

  @Get('logo')
  async getLogo(@Headers('x-device-token') token: string | undefined, @Res() res: Response) {
    if (!token) {
      throw new UnauthorizedException('x-device-token Header fehlt');
    }
    const logo = await this.devicesService.getLogoForDevice(token);
    if (!logo) {
      throw new NotFoundException('Kein Branding-Logo hinterlegt');
    }
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    fs.createReadStream(logo.path).pipe(res);
  }

  @Post('heartbeat')
  heartbeat(
    @Body() metrics: HeartbeatDto = {},
    @Headers('x-device-token') token?: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    if (!token) {
      throw new UnauthorizedException('x-device-token Header fehlt');
    }
    return this.devicesService.heartbeat(token, ip, metrics);
  }
}
