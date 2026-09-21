import { IsOptional, IsString, MinLength } from 'class-validator';

export class PairingRequestDto {
  @IsString()
  @MinLength(4)
  hardwareId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
