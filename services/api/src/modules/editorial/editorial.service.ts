import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { EditPlan, FirstCutRequest } from "@kedov/contracts";
import { ProjectsStore } from "../projects/projects.store";
import type { PromptPlanDto } from "./dto";
import { EditorialStore } from "./editorial.store";
import { mockPromptPlan } from "./prompt-plan.mock";

@Injectable()
export class EditorialService {
  constructor(
    @Inject(ProjectsStore) private readonly projects: ProjectsStore,
    @Inject(EditorialStore) private readonly editorial: EditorialStore,
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

  async getSequence(orgId: string, projectId: string, sequenceId: string) {
    await this.assertProject(orgId, projectId);
    const seq = await this.editorial.getSequence(projectId, sequenceId, orgId);
    if (!seq) {
      throw new NotFoundException({
        code: "sequence_not_found",
        human_message: "Sequence not found",
        retryable: false,
      });
    }
    return seq;
  }

  async createFirstCut(orgId: string, projectId: string, body: FirstCutRequest) {
    await this.assertProject(orgId, projectId);
    if (body.project_id !== projectId) {
      throw new BadRequestException({
        code: "project_mismatch",
        human_message: "body.project_id must match path",
        retryable: false,
      });
    }
    const { planFirstCut } = await import("@kedov/contracts");
    const seq = await this.getSequence(orgId, projectId, body.sequence_id);
    const request = { ...body, expected_revision: body.expected_revision ?? seq.revision };
    const result = planFirstCut(request);
    this.editorial.rememberPlan(
      `${projectId}:${result.plan.sequence_id}:${seq.revision}`,
      result.plan,
    );
    return result;
  }

  /**
   * Prompt → unexecuted EditPlan (AGT). Proxies AI gateway when configured;
   * otherwise uses local mock. Never auto-applies.
   */
  async createPromptPlan(
    orgId: string,
    projectId: string,
    body: PromptPlanDto,
  ): Promise<EditPlan> {
    await this.assertProject(orgId, projectId);
    if (body.project_id !== projectId) {
      throw new BadRequestException({
        code: "project_mismatch",
        human_message: "body.project_id must match path",
        retryable: false,
      });
    }

    const { assertCloudConsent } = await import("@kedov/contracts");
    const provider = (process.env.AI_PROVIDER ?? "mock").trim();
    const consent = assertCloudConsent({
      provider,
      cloud_consent: body.cloud_consent,
      privacy_mode: (body.privacy_mode as "local_first" | "cloud_allowed") ?? "local_first",
    });
    if (!consent.ok) {
      throw new ForbiddenException({
        code: "cloud_consent_required",
        human_message: consent.reason,
        retryable: false,
      });
    }

    const payload = {
      project_id: projectId,
      sequence_id: body.sequence_id,
      expected_revision: body.expected_revision,
      prompt: body.prompt,
      mode: body.mode ?? "preview_then_apply",
      cloud_consent: Boolean(body.cloud_consent),
      privacy_mode: body.privacy_mode ?? "local_first",
    };

    const aiBase = (process.env.AI_API_BASE_URL ?? "").trim();
    if (aiBase) {
      try {
        const res = await fetch(`${aiBase.replace(/\/$/, "")}/ai/plans`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new ServiceUnavailableException({
            code: "ai_gateway_error",
            human_message: text || `AI gateway HTTP ${res.status}`,
            retryable: res.status >= 500,
          });
        }
        return (await res.json()) as EditPlan;
      } catch (err) {
        if (err instanceof ServiceUnavailableException) throw err;
        throw new ServiceUnavailableException({
          code: "ai_gateway_unreachable",
          human_message: (err as Error).message,
          retryable: true,
        });
      }
    }

    return mockPromptPlan(payload);
  }

  async applyPlan(orgId: string, projectId: string, plan: EditPlan) {
    await this.assertProject(orgId, projectId);
    if (plan.project_id !== projectId) {
      throw new BadRequestException({
        code: "project_mismatch",
        human_message: "plan.project_id must match path",
        retryable: false,
      });
    }
    const { applyEditPlan } = await import("@kedov/contracts");
    const seq = await this.getSequence(orgId, projectId, plan.sequence_id);
    const result = applyEditPlan(seq, plan);
    if (!result.ok) {
      throw new BadRequestException({
        code: "plan_apply_failed",
        human_message: result.errors.join("; "),
        retryable: false,
        details: result.errors,
      });
    }
    await this.editorial.saveSequence(projectId, orgId, result.sequence);
    return result;
  }
}
