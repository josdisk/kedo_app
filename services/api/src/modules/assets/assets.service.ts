import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectsStore } from "../projects/projects.store";
import type { CompleteImportSessionDto, CompleteProxyJobDto, CreateProxyJobDto } from "./dto";
import { AssetsStore } from "./assets.store";

@Injectable()
export class AssetsService {
  constructor(
    @Inject(AssetsStore) private readonly assets: AssetsStore,
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

  async listAssets(orgId: string, projectId: string) {
    await this.assertProject(orgId, projectId);
    return this.assets.listAssets(projectId, orgId);
  }

  async createImportSession(orgId: string, userId: string, projectId: string) {
    await this.assertProject(orgId, projectId);
    return this.assets.createSession({
      project_id: projectId,
      organization_id: orgId,
      created_by: userId,
    });
  }

  async completeImportSession(
    orgId: string,
    sessionId: string,
    dto: CompleteImportSessionDto,
  ) {
    const session = await this.assets.getSession(sessionId, orgId);
    if (!session) {
      throw new NotFoundException({
        code: "import_session_not_found",
        human_message: "Import session not found",
        retryable: false,
      });
    }
    if (session.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "import_forbidden",
        human_message: "Not authorized for this import session",
        retryable: false,
      });
    }
    return this.assets.completeSession(sessionId, orgId, dto.files);
  }

  async getImportSession(orgId: string, sessionId: string) {
    const session = await this.assets.getSession(sessionId, orgId);
    if (!session) {
      throw new NotFoundException({
        code: "import_session_not_found",
        human_message: "Import session not found",
        retryable: false,
      });
    }
    if (session.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "import_forbidden",
        human_message: "Not authorized for this import session",
        retryable: false,
      });
    }
    return session;
  }

  async createProxyJob(orgId: string, projectId: string, dto: CreateProxyJobDto) {
    await this.assertProject(orgId, projectId);
    const job = await this.assets.createProxyJob({
      project_id: projectId,
      organization_id: orgId,
      asset_id: dto.asset_id,
      target_height: dto.target_height,
    });
    if (!job) {
      throw new NotFoundException({
        code: "asset_not_found",
        human_message: "Asset not found for proxy job",
        retryable: false,
      });
    }
    return job;
  }

  async getProxyJob(orgId: string, jobId: string) {
    const job = await this.assets.getProxyJob(jobId, orgId);
    if (!job) {
      throw new NotFoundException({
        code: "proxy_job_not_found",
        human_message: "Proxy job not found",
        retryable: false,
      });
    }
    if (job.organization_id !== orgId) {
      throw new ForbiddenException({
        code: "proxy_forbidden",
        human_message: "Not authorized for this proxy job",
        retryable: false,
      });
    }
    return job;
  }

  async tickProxyJob(orgId: string, jobId: string) {
    await this.getProxyJob(orgId, jobId);
    return this.assets.tickProxyJob(jobId, orgId, true);
  }

  async completeProxyJob(orgId: string, jobId: string, dto: CompleteProxyJobDto) {
    await this.getProxyJob(orgId, jobId);
    const job = await this.assets.completeProxyJob(jobId, orgId, {
      proxy_uri: dto.proxy_uri,
      source_mapping: dto.source_mapping,
      encode_backend: dto.encode_backend,
      source_unchanged: dto.source_unchanged,
      message: dto.message,
    });
    if (!job) {
      throw new NotFoundException({
        code: "proxy_job_not_found",
        human_message: "Proxy job not found",
        retryable: false,
      });
    }
    return job;
  }
}
