import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/permissions.constants';

/**
 * Benutzer- & Berechtigungsverwaltung innerhalb eines Mandanten.
 * Zugriff: System-Admin oder Mandant-Admin (bzw. Nutzer mit users.manage Berechtigung).
 */
@Controller('tenants/:tenantId/members')
export class MembersController {
  constructor(private usersService: UsersService) {}

  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.usersService.listMembers(tenantId);
  }

  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @Post()
  add(@Param('tenantId') tenantId: string, @Body() dto: AddMemberDto) {
    return this.usersService.addMember(tenantId, dto);
  }

  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @Patch(':membershipId')
  update(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.usersService.updateMember(tenantId, membershipId, dto);
  }

  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @Delete(':membershipId')
  remove(@Param('tenantId') tenantId: string, @Param('membershipId') membershipId: string) {
    return this.usersService.removeMember(tenantId, membershipId);
  }
}
