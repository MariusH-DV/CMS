import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

function optionalThreshold(max: number) {
  return function (target: object, propertyKey: string) {
    IsOptional()(target, propertyKey);
    ValidateIf((o: Record<string, unknown>) => o[propertyKey] !== null)(target, propertyKey);
    IsInt()(target, propertyKey);
    Min(1)(target, propertyKey);
    Max(max)(target, propertyKey);
  };
}

export class UpdateAdminDeviceDto {
  @IsOptional()
  @IsBoolean()
  isLoaner?: boolean;

  @optionalThreshold(100)
  cpuWarningThresholdPercent?: number | null;

  @optionalThreshold(100)
  ramWarningThresholdPercent?: number | null;

  @optionalThreshold(100)
  diskWarningThresholdPercent?: number | null;

  // GPU-Warngrenze ist eine Temperatur (Grad Celsius), keine Auslastung in
  // Prozent - der Pi liefert nur GPU-Temperatur/Speicher, keine GPU-Last.
  @optionalThreshold(120)
  gpuWarningThresholdC?: number | null;
}
