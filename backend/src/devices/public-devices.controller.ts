import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PairingRequestDto } from './dto/pairing-request.dto';
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

  @Post('heartbeat')
  heartbeat(@Headers('x-device-token') token?: string, @Headers('x-forwarded-for') ip?: string) {
    if (!token) {
      throw new UnauthorizedException('x-device-token Header fehlt');
    }
    return this.devicesService.heartbeat(token, ip);
  }
}
