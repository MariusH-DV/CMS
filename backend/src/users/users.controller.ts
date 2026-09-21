import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SystemAdminOnly } from '../common/decorators/permissions.decorator';

/** Globale Benutzerverwaltung (nur System-Admin). */
@SystemAdminOnly()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get()
  list() {
    return this.usersService.listUsers();
  }
}
