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
import {
  AttachDriftDto,
  AttachFingerprintDto,
  CreateSyncSessionDto,
  SyncOverrideDto,
} from "./dto";
import { SyncService } from "./sync.service";

@ApiTags("sync")
@ApiHeader({ name: "x-kedov-user-id", required: true })
@ApiHeader({ name: "x-kedov-org-id", required: true })
@UseGuards(TenantGuard)
@Controller()
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  @Get("v1/projects/:projectId/sync-sessions")
  list(@Req() req: TenantRequest, @Param("projectId") projectId: string) {
    return this.sync.list(req.kedovOrgId!, projectId);
  }

  @Post("v1/projects/:projectId/sync-jobs")
  create(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: CreateSyncSessionDto,
  ) {
    // PRD route name sync-jobs; R0 completes synchronously into a persisted session.
    return this.sync.create(req.kedovOrgId!, projectId, body);
  }

  @Get("v1/sync-sessions/:sessionId")
  get(@Req() req: TenantRequest, @Param("sessionId") sessionId: string) {
    return this.sync.get(req.kedovOrgId!, sessionId);
  }

  @Post("v1/sync-alignments/:sessionId/override")
  override(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: SyncOverrideDto,
  ) {
    return this.sync.override(req.kedovOrgId!, sessionId, body);
  }

  @Post("v1/sync-alignments/:sessionId/drift")
  attachDrift(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: AttachDriftDto,
  ) {
    return this.sync.attachDrift(req.kedovOrgId!, sessionId, body);
  }

  @Post("v1/sync-alignments/:sessionId/fingerprint")
  attachFingerprint(
    @Req() req: TenantRequest,
    @Param("sessionId") sessionId: string,
    @Body() body: AttachFingerprintDto,
  ) {
    return this.sync.attachFingerprint(req.kedovOrgId!, sessionId, body);
  }
}
