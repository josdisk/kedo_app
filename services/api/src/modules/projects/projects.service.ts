import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateProjectDto, UpdateProjectDto } from "./dto";
import { ProjectsStore } from "./projects.store";
import type { ProjectSummary } from "./project.types";

@Injectable()
export class ProjectsService {
  constructor(@Inject(ProjectsStore) private readonly store: ProjectsStore) {}

  async list(orgId: string, userId?: string): Promise<ProjectSummary[]> {
    return this.store.listForOrg(orgId, userId);
  }

  async get(projectId: string, orgId: string, userId?: string): Promise<ProjectSummary> {
    const project = await this.store.get(projectId, orgId, userId);
    if (!project) {
      throw new NotFoundException({
        code: "project_not_found",
        human_message: "Project not found",
        retryable: false,
      });
    }
    if (project.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "project_forbidden",
        human_message: "Not authorized for this project",
        retryable: false,
      });
    }
    return {
      id: project.id,
      name: project.name,
      genre: project.genre,
      privacy_mode: project.privacy_mode,
      revision: project.revision,
      updated_at: project.updated_at,
      organization_id: project.organization_id,
    };
  }

  async create(
    orgId: string,
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectSummary> {
    if (dto.organization_id && dto.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "org_mismatch",
        human_message: "organization_id does not match authenticated tenant",
        retryable: false,
      });
    }
    const created = await this.store.create({
      organization_id: orgId,
      name: dto.name,
      genre: dto.genre ?? "generic",
      privacy_mode: dto.privacy_mode ?? "local_first",
      created_by: userId,
    });
    return this.get(created.id, orgId, userId);
  }

  async update(
    projectId: string,
    orgId: string,
    dto: UpdateProjectDto,
    userId?: string,
  ): Promise<ProjectSummary> {
    const updated = await this.store.update(projectId, orgId, dto, userId);
    if (!updated) {
      const existing = await this.store.get(projectId, orgId, userId);
      if (!existing) {
        // Cross-tenant probe without GUCs may return undefined under RLS — same as not found.
        throw new NotFoundException({
          code: "project_not_found",
          human_message: "Project not found",
          retryable: false,
        });
      }
      throw new ForbiddenException({
        code: "project_forbidden",
        human_message: "Not authorized for this project",
        retryable: false,
      });
    }
    return this.get(projectId, orgId, userId);
  }
}
