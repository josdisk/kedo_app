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
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import type { EditPlan, FirstCutRequest } from "@kedov/contracts";
import { TenantGuard, type TenantRequest } from "../common/tenant.guard";
import { ApplyPlanDto, FirstCutDto, PromptPlanDto } from "./dto";
import { EditorialService } from "./editorial.service";

@ApiTags("editorial")
@ApiHeader({ name: "x-kedov-user-id", required: false })
@ApiHeader({ name: "x-kedov-org-id", required: false })
@ApiBearerAuth("oidc")
@UseGuards(TenantGuard)
@Controller()
export class EditorialController {
  constructor(@Inject(EditorialService) private readonly editorial: EditorialService) {}

  @Get("v1/projects/:projectId/sequences/:sequenceId")
  getSequence(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Param("sequenceId") sequenceId: string,
  ) {
    return this.editorial.getSequence(req.kedovOrgId!, projectId, sequenceId);
  }

  @Post("v1/projects/:projectId/ai/first-cut")
  async firstCut(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: FirstCutDto,
  ) {
    return this.editorial.createFirstCut(req.kedovOrgId!, projectId, body as FirstCutRequest);
  }

  /** Prompt → unexecuted EditPlan (AGT). */
  @Post("v1/projects/:projectId/ai/plans")
  async promptPlan(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: PromptPlanDto,
  ) {
    return this.editorial.createPromptPlan(req.kedovOrgId!, projectId, body);
  }

  @Post("v1/projects/:projectId/ai/plans/apply")
  async apply(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: ApplyPlanDto,
  ) {
    return this.editorial.applyPlan(req.kedovOrgId!, projectId, body.plan as unknown as EditPlan);
  }
}
