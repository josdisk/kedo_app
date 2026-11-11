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
import { CreateProjectDto, UpdateProjectDto } from "./dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiHeader({ name: "x-kedov-user-id", required: true })
@ApiHeader({ name: "x-kedov-org-id", required: true })
@UseGuards(TenantGuard)
@Controller("v1/projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  list(@Req() req: TenantRequest) {
    return this.projects.list(req.kedovOrgId!, req.kedovUserId);
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() body: CreateProjectDto) {
    return this.projects.create(req.kedovOrgId!, req.kedovUserId!, body);
  }

  @Get(":projectId")
  get(@Req() req: TenantRequest, @Param("projectId") projectId: string) {
    return this.projects.get(projectId, req.kedovOrgId!, req.kedovUserId);
  }

  @Patch(":projectId")
  update(
    @Req() req: TenantRequest,
    @Param("projectId") projectId: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, req.kedovOrgId!, body, req.kedovUserId);
  }
}
