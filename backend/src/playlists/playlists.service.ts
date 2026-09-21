import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { SetPlaylistItemsDto } from './dto/set-playlist-items.dto';

@Injectable()
export class PlaylistsService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({ data: { tenantId, name: dto.name } });
  }

  list(tenantId: string) {
    return this.prisma.playlist.findMany({
      where: { tenantId },
      include: { items: { include: { mediaAsset: true }, orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id, tenantId },
      include: { items: { include: { mediaAsset: true }, orderBy: { order: 'asc' } } },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist nicht gefunden');
    }
    return playlist;
  }

  async rename(tenantId: string, id: string, name: string) {
    await this.findOne(tenantId, id);
    return this.prisma.playlist.update({ where: { id }, data: { name } });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.playlist.delete({ where: { id } });
    return { success: true };
  }

  /** Ersetzt die komplette Item-Liste einer Playlist (Reihenfolge = Array-Reihenfolge). */
  async setItems(tenantId: string, id: string, dto: SetPlaylistItemsDto) {
    await this.findOne(tenantId, id);

    await this.prisma.$transaction([
      this.prisma.playlistItem.deleteMany({ where: { playlistId: id } }),
      this.prisma.playlistItem.createMany({
        data: dto.items.map((item, index) => ({
          playlistId: id,
          mediaAssetId: item.mediaAssetId,
          durationSeconds: item.durationSeconds,
          order: index,
        })),
      }),
    ]);

    return this.findOne(tenantId, id);
  }
}
