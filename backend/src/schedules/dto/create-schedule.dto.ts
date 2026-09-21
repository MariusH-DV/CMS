import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum ScheduleRecurrenceDto {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export class CreateScheduleDto {
  @IsString()
  playlistId!: string;

  @IsString()
  deviceId!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(ScheduleRecurrenceDto)
  recurrence?: ScheduleRecurrenceDto;

  @IsOptional()
  @IsInt()
  priority?: number;
}
