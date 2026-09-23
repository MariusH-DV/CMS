import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PlayerDistributionService } from './player-distribution.service';
import { Public } from '../common/decorators/public.decorator';

/** Vom Pi-Auto-Updater genutzt (siehe player-update-check.sh.tpl) - kein Geraete-Token noetig. */
@Public()
@Controller('public/player')
export class PlayerDistributionController {
  constructor(private service: PlayerDistributionService) {}

  @Get('version')
  version() {
    return { version: this.service.getVersion() };
  }

  @Get('package')
  package(@Res() res: Response) {
    const archive = this.service.buildPackage();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="player.zip"');
    archive.pipe(res);
  }
}
