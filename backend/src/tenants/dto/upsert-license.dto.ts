import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpsertLicenseDto {
  @IsInt()
  @Min(0)
  maxMonitors!: number;

  @IsInt()
  @Min(0)
  maxUsers!: number;

  @IsInt()
  @Min(0)
  maxStorageMb!: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  brandingEnabled?: boolean;
}
