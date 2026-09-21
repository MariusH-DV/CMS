import { IsOptional, IsString, MinLength } from 'class-validator';

export class GeneratePackageDto {
  /** Optional: WLAN wird bei aktuellen Raspberry Pi OS Versionen meist bereits
   * direkt im Raspberry Pi Imager eingerichtet. Wird hier trotzdem etwas
   * angegeben, legt das Paket zusaetzlich wpa_supplicant.conf/nm-wifi.conf
   * als Fallback bei (z.B. fuer Option B oder aeltere Images). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  ssid?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Das WLAN-Passwort muss mindestens 8 Zeichen haben' })
  wifiPassword?: string;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
