import { IsString, Length } from 'class-validator';

export class UnlockDeviceDto {
  @IsString()
  @Length(1, 20)
  pin!: string;
}
