import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { SetPlaylistItemsDto } from './dto/set-playlist-items.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

@Controller('tenants/:tenantId/playlists')
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @RequirePermissions(PERMISSIONS.PLAYLISTS_MANAGE)
  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.playlistsService.list(tenantId);
  }

  @RequirePermissions(PERMISSIONS.PLAYLISTS_MANAGE)
  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(tenantId, dto);
  }

  @RequirePermissions(PERMISSIONS.PLAYLISTS_MANAGE)
  @Get(':id')
  findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.playlistsService.findOne(tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.PLAYLISTS_MANAGE)
  @Put(':id/items')
  setItems(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetPlaylistItemsDto,
  ) {
    return this.playlistsService.setItems(tenantId, id, dto);
  }

  @RequirePermissions(PERMISSIONS.PLAYLISTS_MANAGE)
  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.playlistsService.remove(tenantId, id);
  }
}
