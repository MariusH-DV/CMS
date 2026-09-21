import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MediaService } from './media.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';
import { Public } from '../common/decorators/public.decorator';

@Controller('tenants/:tenantId/media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @RequirePermissions(PERMISSIONS.MEDIA_MANAGE)
  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.mediaService.list(tenantId);
  }

  @RequirePermissions(PERMISSIONS.MEDIA_MANAGE)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.upload(tenantId, user.sub, file);
  }

  @RequirePermissions(PERMISSIONS.MEDIA_MANAGE)
  @Delete(':mediaId')
  remove(@Param('tenantId') tenantId: string, @Param('mediaId') mediaId: string) {
    return this.mediaService.remove(tenantId, mediaId);
  }

  // Streaming ist bewusst public (Player benoetigt keinen JWT), damit Bilder/Videos
  // direkt im <img>/<video> Tag geladen werden koennen.
  @Public()
  @Get(':mediaId/file')
  async stream(
    @Param('tenantId') tenantId: string,
    @Param('mediaId') mediaId: string,
    @Res() res: Response,
  ) {
    const { stream, asset } = await this.mediaService.getFileStream(tenantId, mediaId);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }
}
