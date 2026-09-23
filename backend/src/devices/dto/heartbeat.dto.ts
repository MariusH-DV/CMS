import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

/** Optionale Systemmetriken, die der Player bei jedem Heartbeat mitschickt. */
export class HeartbeatDto {
  @IsOptional()
  @IsNumber()
  uptimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  cpuLoadPercent?: number;

  @IsOptional()
  @IsNumber()
  memUsedPercent?: number;

  @IsOptional()
  @IsNumber()
  diskUsedPercent?: number;

  @IsOptional()
  @IsBoolean()
  gpuAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  gpuTempC?: number;

  @IsOptional()
  @IsNumber()
  gpuMemMb?: number;

  @IsOptional()
  @IsString()
  playerVersion?: string;
}
