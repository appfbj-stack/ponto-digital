import { IsEnum, IsNumber, IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class RegisterAttendanceDto {
  @IsEnum(AttendanceType)
  type!: AttendanceType;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsNumber()
  accuracy!: number;

  @IsString()
  faceToken!: string;

  @IsNumber()
  faceConfidence!: number;

  @IsBoolean()
  livenessPassed!: boolean;

  @IsString()
  deviceId!: string;

  @IsString()
  clientTimestamp!: string;

  @IsString()
  clientEventId!: string;

  @IsUUID()
  @IsOptional()
  locationId?: string;
}
