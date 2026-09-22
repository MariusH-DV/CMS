import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: {
        tenantId,
        playlistId: dto.playlistId,
        deviceId: dto.deviceId,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        recurrence: dto.recurrence,
        priority: dto.priority ?? 0,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.schedule.findMany({
      where: { tenantId },
      include: { playlist: true, device: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, tenantId } });
    if (!schedule) {
      throw new NotFoundException('Zeitplan nicht gefunden');
    }
    return this.prisma.schedule.update({
      where: { id },
      data: {
        playlistId: dto.playlistId,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : undefined,
        recurrence: dto.recurrence,
        priority: dto.priority,
      },
      include: { playlist: true, device: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, tenantId } });
    if (!schedule) {
      throw new NotFoundException('Zeitplan nicht gefunden');
    }
    await this.prisma.schedule.delete({ where: { id } });
    return { success: true };
  }
}
