import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ImportFileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  filename!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  size_bytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  sha256?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locator_uri?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  media_properties?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  quarantined?: boolean;
}

export class CompleteImportSessionDto {
  @ApiProperty({ type: [ImportFileDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportFileDto)
  files!: ImportFileDto[];
}

export class CreateProxyJobDto {
  @ApiProperty()
  @IsString()
  asset_id!: string;

  @ApiPropertyOptional({ default: 720 })
  @IsOptional()
  @IsInt()
  @Min(240)
  @Max(2160)
  target_height?: number;
}

export class ProxySourceMappingDto {
  @ApiProperty()
  @IsString()
  source_uri!: string;

  @ApiProperty()
  @IsString()
  proxy_uri!: string;

  @ApiProperty()
  @IsInt()
  @Min(120)
  @Max(4320)
  target_height!: number;

  @ApiProperty()
  @IsString()
  scale_filter!: string;

  @ApiProperty({ enum: ["preserve_source"] })
  @IsString()
  timebase_policy!: "preserve_source";
}

export class CompleteProxyJobDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2048)
  proxy_uri!: string;

  @ApiProperty({ type: ProxySourceMappingDto })
  @ValidateNested()
  @Type(() => ProxySourceMappingDto)
  source_mapping!: ProxySourceMappingDto;

  @ApiPropertyOptional({ default: "ffmpeg-cli" })
  @IsOptional()
  @IsString()
  encode_backend?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  source_unchanged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  message?: string;
}
