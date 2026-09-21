import { IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten',
  })
  slug!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonitors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageMb?: number;
}
