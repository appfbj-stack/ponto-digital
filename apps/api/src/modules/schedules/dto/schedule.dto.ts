import { IsString, IsEnum, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';
import { ScheduleType } from '@prisma/client';

interface DayConfig {
  entry?: string;
  breakStart?: string;
  breakEnd?: string;
  exit?: string;
}

export class CreateScheduleDto {
  @IsString()
  name!: string;

  @IsEnum(ScheduleType)
  @IsOptional()
  scheduleType?: ScheduleType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  entryToleranceMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  exitToleranceMinutes?: number;

  @IsObject()
  weeklyHours!: Record<string, DayConfig | null>;
}

export class UpdateScheduleDto extends CreateScheduleDto {}
