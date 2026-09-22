import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

@Controller('tenants/:tenantId/schedules')
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @RequirePermissions(PERMISSIONS.SCHEDULES_MANAGE)
  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.schedulesService.list(tenantId);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULES_MANAGE)
  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(tenantId, dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULES_MANAGE)
  @Patch(':id')
  update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(tenantId, id, dto);
  }

  @RequirePermissions(PERMISSIONS.SCHEDULES_MANAGE)
  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.schedulesService.remove(tenantId, id);
  }
}
