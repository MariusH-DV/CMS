import { IsString, Length, MinLength } from 'class-validator';

export class ClaimDeviceDto {
  @IsString()
  @Length(6, 6)
  pin!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
