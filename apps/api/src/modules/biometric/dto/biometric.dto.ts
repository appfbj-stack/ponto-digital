import { IsArray, IsNumber, IsString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class EmbeddingDto {
  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];

  @IsString()
  modelVersion!: string;

  @IsNumber()
  quality!: number;

  @IsOptional()
  @IsNumber()
  size?: number;
}

export class LivenessDto {
  @IsNumber()
  confidence!: number;

  @IsObject()
  checks!: {
    faceDetected: boolean;
    singleFace: boolean;
    movementDetected: boolean;
    timing: number;
  };
}

export class RegisterBiometricDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbeddingDto)
  samples!: EmbeddingDto[]; // 3-5 capturas pra maior robustez

  @ValidateNested()
  @Type(() => LivenessDto)
  liveness!: LivenessDto;

  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class VerifyBiometricDto {
  @ValidateNested()
  @Type(() => EmbeddingDto)
  embedding!: EmbeddingDto;

  @ValidateNested()
  @Type(() => LivenessDto)
  liveness!: LivenessDto;

  @IsString()
  deviceId!: string;
}
