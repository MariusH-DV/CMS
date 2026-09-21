import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  playlistId?: string | null;
}
