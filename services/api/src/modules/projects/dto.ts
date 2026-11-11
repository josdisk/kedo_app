import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ default: "generic" })
  @IsOptional()
  @IsString()
  @IsIn(["generic", "music_video", "wedding", "podcast", "film", "social", "church", "education"])
  genre?: string;

  @ApiPropertyOptional({ default: "local_first" })
  @IsOptional()
  @IsString()
  @IsIn(["local_first", "hybrid", "cloud"])
  privacy_mode?: string;

  @ApiPropertyOptional({
    description: "Must match authenticated org when provided",
  })
  @IsOptional()
  @IsString()
  organization_id?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(["generic", "music_video", "wedding", "podcast", "film", "social", "church", "education"])
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(["local_first", "hybrid", "cloud"])
  privacy_mode?: string;
}
