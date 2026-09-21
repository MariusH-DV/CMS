import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantRoleDto } from './add-member.dto';

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(TenantRoleDto)
  role?: TenantRoleDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
