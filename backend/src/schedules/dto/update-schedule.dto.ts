import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ScheduleRecurrenceDto } from './create-schedule.dto';

/** Wie CreateScheduleDto, aber alle Felder optional und ohne deviceId (Geraet wird beim Bearbeiten nicht mehr geaendert). */
export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  playlistId?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

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
