import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

class AlternateDto {
  @IsInt()
  sample_offset!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsNumber()
  peak_correlation!: number;

  @IsString()
  note!: string;
}

class SyncClipDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  asset_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  camera_label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  recorded_at_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explicit_take_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sample_offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  peak_correlation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ambiguous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [AlternateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlternateDto)
  alternates?: AlternateDto[];
}

export class CreateSyncSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  master_asset_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(8000)
  sample_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  fps_num?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  fps_den?: number;

  @ApiProperty({ type: [SyncClipDto] })
  @IsArray()
  @ArrayMaxSize(256)
  @ValidateNested({ each: true })
  @Type(() => SyncClipDto)
  clips!: SyncClipDto[];
}

export class SyncOverrideDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  asset_id!: string;

  @ApiProperty()
  @IsInt()
  sample_offset!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

class DriftAnchorDto {
  @ApiProperty()
  @IsInt()
  source_sample!: number;

  @ApiProperty()
  @IsInt()
  master_sample!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

export class AttachDriftDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  asset_id!: string;

  @ApiProperty({ type: [DriftAnchorDto] })
  @IsArray()
  @ArrayMaxSize(256)
  @ValidateNested({ each: true })
  @Type(() => DriftAnchorDto)
  anchors!: DriftAnchorDto[];
}

class FingerprintCandidateDto {
  @ApiProperty()
  @IsInt()
  sample_offset!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  vote_count!: number;

  @ApiProperty()
  @IsString()
  note!: string;
}

export class AttachFingerprintDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  asset_id!: string;

  @ApiPropertyOptional({ default: "kedov-fp-bands-onset-1.0" })
  @IsOptional()
  @IsString()
  algorithm_version?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  landmark_count_ref!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  landmark_count_query!: number;

  @ApiProperty({ type: [FingerprintCandidateDto] })
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => FingerprintCandidateDto)
  candidates!: FingerprintCandidateDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ambiguous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
