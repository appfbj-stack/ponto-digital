import { IsDateString, IsEnum, IsString, MinLength } from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class CreateCorrectionDto {
  @IsDateString()
  date!: string;

  @IsEnum(AttendanceType)
  type!: AttendanceType;

  @IsDateString()
  requestedTime!: string;

  @IsString()
  @MinLength(5, { message: 'Justificativa muito curta' })
  reason!: string;
}

export class ReviewCorrectionDto {
  @IsString()
  status!: 'APPROVED' | 'REJECTED';

  @IsString()
  reviewNotes?: string;
}
