import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsStore } from "../projects/projects.store";
import type {
  AttachDriftDto,
  AttachFingerprintDto,
  CreateSyncSessionDto,
  SyncOverrideDto,
} from "./dto";
import { SyncStore } from "./sync.store";

@Injectable()
export class SyncService {
  constructor(
    @Inject(SyncStore) private readonly sync: SyncStore,
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
  }

  async list(orgId: string, projectId: string) {
    await this.assertProject(orgId, projectId);
    return this.sync.listForProject(projectId, orgId);
  }

  async get(orgId: string, sessionId: string) {
    const session = await this.sync.get(sessionId, orgId);
    if (!session) {
      throw new NotFoundException({
        code: "sync_session_not_found",
        human_message: "Sync session not found",
        retryable: false,
      });
    }
    if (session.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "sync_forbidden",
        human_message: "Not authorized for this sync session",
        retryable: false,
      });
    }
    return session;
  }

  async create(orgId: string, projectId: string, dto: CreateSyncSessionDto) {
    await this.assertProject(orgId, projectId);
    return this.sync.create({
      project_id: projectId,
      organization_id: orgId,
      master_asset_id: dto.master_asset_id,
      sample_rate: dto.sample_rate,
      fps_num: dto.fps_num,
      fps_den: dto.fps_den,
      clips: dto.clips,
    });
  }

  async override(orgId: string, sessionId: string, dto: SyncOverrideDto) {
    await this.get(orgId, sessionId);
    const updated = await this.sync.override(
      sessionId,
      orgId,
      dto.asset_id,
      dto.sample_offset,
      dto.note,
    );
    if (!updated) {
      throw new NotFoundException({
        code: "alignment_not_found",
        human_message: "Asset alignment not found in session",
        retryable: false,
      });
    }
    return updated;
  }

  async attachDrift(orgId: string, sessionId: string, dto: AttachDriftDto) {
    await this.get(orgId, sessionId);
    const updated = await this.sync.attachDrift(
      sessionId,
      orgId,
      dto.asset_id,
      dto.anchors,
    );
    if (!updated) {
      throw new NotFoundException({
        code: "alignment_not_found",
        human_message: "Asset alignment not found in session",
        retryable: false,
      });
    }
    return updated;
  }

  async attachFingerprint(orgId: string, sessionId: string, dto: AttachFingerprintDto) {
    await this.get(orgId, sessionId);
    const updated = await this.sync.attachFingerprint(sessionId, orgId, dto);
    if (!updated) {
      throw new NotFoundException({
        code: "alignment_not_found",
        human_message: "Asset alignment not found in session",
        retryable: false,
      });
    }
    return updated;
  }
}
