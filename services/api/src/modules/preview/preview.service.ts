import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsStore } from "../projects/projects.store";
import type { CreatePreviewSessionDto, PreviewTierDto, ScrubPreviewDto } from "./dto";
import { PreviewStore } from "./preview.store";

@Injectable()
export class PreviewService {
  constructor(
    @Inject(PreviewStore) private readonly preview: PreviewStore,
    @Inject(ProjectsStore) private readonly projects: ProjectsStore,
  ) {}

  private async assertProject(orgId: string, projectId: string) {
    const project = await this.projects.get(projectId, orgId);
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
    return project;
  }

  async create(orgId: string, projectId: string, dto: CreatePreviewSessionDto) {
    await this.assertProject(orgId, projectId);
    return this.preview.create({
      project_id: projectId,
      organization_id: orgId,
      asset_id: dto.asset_id,
      duration_frames: dto.duration_frames,
      fps_num: dto.fps_num,
      fps_den: dto.fps_den,
      preview_tier: dto.preview_tier,
    });
  }

  async get(orgId: string, sessionId: string) {
    const session = await this.preview.get(sessionId, orgId);
    if (!session) {
      throw new NotFoundException({
        code: "preview_not_found",
        human_message: "Preview session not found",
        retryable: false,
      });
    }
    if (session.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "preview_forbidden",
        human_message: "Not authorized for this preview session",
        retryable: false,
      });
    }
    return session;
  }

  async scrub(orgId: string, sessionId: string, dto: ScrubPreviewDto) {
    await this.get(orgId, sessionId);
    const session = await this.preview.scrub(sessionId, orgId, dto.frame_index);
    if (!session) {
      throw new NotFoundException({
        code: "preview_not_found",
        human_message: "Preview session not found",
        retryable: false,
      });
    }
    return session;
  }

  async setTier(orgId: string, sessionId: string, dto: PreviewTierDto) {
    await this.get(orgId, sessionId);
    const session = await this.preview.setTier(sessionId, orgId, dto.preview_tier);
    if (!session) {
      throw new NotFoundException({
        code: "preview_not_found",
        human_message: "Preview session not found",
        retryable: false,
      });
    }
    return session;
  }
}
