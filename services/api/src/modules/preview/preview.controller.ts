import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { TenantGuard, type TenantRequest } from "../common/tenant.guard";
import { CreatePreviewSessionDto, PreviewTierDto, ScrubPreviewDto } from "./dto";
import { PreviewService } from "./preview.service";

@ApiTags("preview")
@ApiHeader({ name: "x-kedov-user-id", required: true })
@ApiHeader({ name: "x-kedov-org-id", required: true })
@UseGuards(TenantGuard)
@Controller()
export class PreviewController {
  constructor(@Inject(PreviewService) private readonly preview: PreviewService) {}

  @Post("v1/projects/:projectId/preview-sessions")
  create(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: CreatePreviewSessionDto,
  ) {
    return this.preview.create(req.kedovOrgId!, projectId, body);
  }

  @Get("v1/preview-sessions/:sessionId")
  get(@Req() req: TenantRequest, @Param("sessionId") sessionId: string) {
    return this.preview.get(req.kedovOrgId!, sessionId);
  }

  @Post("v1/preview-sessions/:sessionId/scrub")
  scrub(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: ScrubPreviewDto,
  ) {
    return this.preview.scrub(req.kedovOrgId!, sessionId, body);
  }

  @Patch("v1/preview-sessions/:sessionId/tier")
  setTier(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: PreviewTierDto,
  ) {
    return this.preview.setTier(req.kedovOrgId!, sessionId, body);
  }
}
