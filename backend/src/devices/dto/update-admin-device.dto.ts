import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateAdminDeviceDto {
  @IsOptional()
  @IsBoolean()
  isLoaner?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.warningThresholdPercent !== null)
  @IsInt()
  @Min(1)
  @Max(100)
  warningThresholdPercent?: number | null;
}
