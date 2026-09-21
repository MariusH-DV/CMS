import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MembersController } from './members.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  providers: [UsersService],
  controllers: [UsersController, MembersController],
  exports: [UsersService],
})
export class UsersModule {}
