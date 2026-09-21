import { IsOptional, IsString, MinLength } from 'class-validator';

export class GeneratePackageDto {
  @IsString()
  @MinLength(1)
  ssid!: string;

  @IsString()
  @MinLength(8, { message: 'Das WLAN-Passwort muss mindestens 8 Zeichen haben' })
  wifiPassword!: string;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
