import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { TenantGuard, type TenantRequest } from "../common/tenant.guard";
import { AssetsService } from "./assets.service";
import { CompleteImportSessionDto, CompleteProxyJobDto, CreateProxyJobDto } from "./dto";

@ApiTags("assets")
@ApiHeader({ name: "x-kedov-user-id", required: true })
@ApiHeader({ name: "x-kedov-org-id", required: true })
@UseGuards(TenantGuard)
@Controller()
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  @Get("v1/projects/:projectId/assets")
  list(@Req() req: TenantRequest, @Param("projectId") projectId: string) {
    return this.assets.listAssets(req.kedovOrgId!, projectId);
  }

  @Post("v1/projects/:projectId/assets/import-sessions")
  createSession(@Req() req: TenantRequest, @Param("projectId") projectId: string) {
    return this.assets.createImportSession(req.kedovOrgId!, req.kedovUserId!, projectId);
  }

  @Get("v1/import-sessions/:sessionId")
  getSession(@Req() req: TenantRequest, @Param("sessionId") sessionId: string) {
    return this.assets.getImportSession(req.kedovOrgId!, sessionId);
  }

  @Post("v1/import-sessions/:sessionId/complete")
  complete(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: CompleteImportSessionDto,
  ) {
    return this.assets.completeImportSession(req.kedovOrgId!, sessionId, body);
  }

  @Post("v1/projects/:projectId/proxy-jobs")
  createProxy(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: CreateProxyJobDto,
  ) {
    return this.assets.createProxyJob(req.kedovOrgId!, projectId, body);
  }

  @Get("v1/proxy-jobs/:jobId")
  getProxy(@Req() req: TenantRequest, @Param("jobId") jobId: string) {
    return this.assets.getProxyJob(req.kedovOrgId!, jobId);
  }

  @Post("v1/proxy-jobs/:jobId/tick")
  tickProxy(@Req() req: TenantRequest, @Param("jobId") jobId: string) {
    return this.assets.tickProxyJob(req.kedovOrgId!, jobId);
  }

  @Post("v1/proxy-jobs/:jobId/complete")
  completeProxy(
    @Req() req: TenantRequest,
    @Param("jobId") jobId: string,
    @Body() body: CompleteProxyJobDto,
  ) {
    return this.assets.completeProxyJob(req.kedovOrgId!, jobId, body);
  }
}
