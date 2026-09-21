import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum TenantRoleDto {
  TENANT_ADMIN = 'TENANT_ADMIN',
  TENANT_USER = 'TENANT_USER',
}

export class AddMemberDto {
  @IsEmail()
  email!: string;

  /** Nur erforderlich, wenn fuer diese E-Mail noch kein Benutzer existiert. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEnum(TenantRoleDto)
  role!: TenantRoleDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
