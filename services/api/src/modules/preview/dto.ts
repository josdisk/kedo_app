import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreatePreviewSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset_id?: string;

  @ApiPropertyOptional({ default: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  duration_frames?: number;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  fps_num?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  fps_den?: number;

  @ApiPropertyOptional({ enum: ["full", "proxy", "thumbnail"], default: "proxy" })
  @IsOptional()
  @IsIn(["full", "proxy", "thumbnail"])
  preview_tier?: "full" | "proxy" | "thumbnail";
}

export class ScrubPreviewDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  frame_index!: number;
}

export class PreviewTierDto {
  @ApiProperty({ enum: ["full", "proxy", "thumbnail"] })
  @IsIn(["full", "proxy", "thumbnail"])
  preview_tier!: "full" | "proxy" | "thumbnail";
}
