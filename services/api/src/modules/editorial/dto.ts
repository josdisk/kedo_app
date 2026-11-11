import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

class ShotCandidateDto {
  @IsString()
  @MinLength(1)
  asset_id!: string;

  @IsString()
  take_id!: string;

  @IsOptional()
  @IsString()
  angle_id?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  sync_confidence!: number;

  @IsInt()
  @Min(0)
  start_frame!: number;

  @IsInt()
  @Min(0)
  end_frame!: number;

  @IsInt()
  @Min(0)
  source_in_frame!: number;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  focus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  composition?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  face_visibility?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  stability?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  action?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  intelligibility?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  emotional_relevance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  uniqueness?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  lip_sync?: number;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class FirstCutDto {
  @ApiProperty()
  @IsString()
  project_id!: string;

  @ApiProperty()
  @IsString()
  sequence_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  expected_revision?: number;

  @ApiProperty()
  @IsIn(["music_video", "wedding", "podcast", "film", "social", "church", "education", "generic"])
  genre!: string;

  @ApiProperty({ type: [ShotCandidateDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShotCandidateDto)
  candidates!: ShotCandidateDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  authenticity_lock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  target_clip_id?: string;
}

export class ApplyPlanDto {
  @IsObject()
  plan!: Record<string, unknown>;
}

export class PromptPlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  project_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  sequence_id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  expected_revision!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  prompt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["preview_then_apply", "apply_with_confirmation", "draft_only"])
  mode?: string;

  @ApiPropertyOptional({
    description: "Required for non-mock cloud providers (AGT / SEC)",
  })
  @IsOptional()
  @IsBoolean()
  cloud_consent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["local_first", "cloud_allowed"])
  privacy_mode?: string;
}
