import type {
  CreateSyncSessionInput,
  EditPlan,
  ProjectSummary,
  SyncOverrideInput,
  SyncSession,
} from "@kedov/contracts";

export {
  buildAuthHeaders,
  resolveClientAuthMode,
  type AuthConfig,
  type ClientAuthMode,
} from "./auth-headers.js";

export interface ApiProblem {
  code: string;
  human_message: string;
  retryable: boolean;
  trace_id?: string;
  details?: unknown;
}

export class KedovApiError extends Error {
  constructor(public readonly problem: ApiProblem, public readonly status: number) {
    super(problem.human_message);
    this.name = "KedovApiError";
  }
}

export interface CreateProjectInput {
  name: string;
  genre?: string;
  privacy_mode?: string;
  organization_id: string;
}

export type HeaderProvider =
  | (() => Record<string, string>)
  | (() => Promise<Record<string, string>>);

export class KedovApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getHeaders: HeaderProvider = () => ({}),
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const authHeaders = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...authHeaders,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let problem: ApiProblem = {
        code: "http_error",
        human_message: res.statusText || "Request failed",
        retryable: res.status >= 500,
      };
      try {
        problem = (await res.json()) as ApiProblem;
      } catch {
        /* keep default */
      }
      throw new KedovApiError(problem, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  health(): Promise<{ status: string; service: string }> {
    return this.request("/health");
  }

  listProjects(): Promise<ProjectSummary[]> {
    return this.request("/v1/projects");
  }

  getProject(projectId: string): Promise<ProjectSummary> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}`);
  }

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return this.request("/v1/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Prompt → unexecuted EditPlan (AGT / M4). Never auto-applies. */
  createAiPlan(body: {
    project_id: string;
    sequence_id: string;
    expected_revision: number;
    prompt: string;
    mode?: string;
    cloud_consent?: boolean;
    privacy_mode?: string;
  }): Promise<EditPlan> {
    return this.request(`/v1/projects/${encodeURIComponent(body.project_id)}/ai/plans`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** Genre first-cut planner (EDT). */
  createFirstCut(body: Record<string, unknown>): Promise<{
    plan: EditPlan;
    rationale: string[];
    rejected: Array<{ asset_id: string; reason: string }>;
    scores?: unknown[];
  }> {
    const projectId = String(body.project_id ?? "");
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/ai/first-cut`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  applyAiPlan(projectId: string, plan: EditPlan): Promise<{
    ok: boolean;
    sequence: unknown;
  }> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/ai/plans/apply`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  }

  listAssets(projectId: string): Promise<SourceAsset[]> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/assets`);
  }

  createImportSession(projectId: string): Promise<ImportSession> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/assets/import-sessions`, {
      method: "POST",
      body: "{}",
    });
  }

  completeImportSession(
    sessionId: string,
    files: ImportFileInput[],
  ): Promise<ImportSession> {
    return this.request(`/v1/import-sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ files }),
    });
  }

  createProxyJob(
    projectId: string,
    input: { asset_id: string; target_height?: number },
  ): Promise<ProxyJob> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/proxy-jobs`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  tickProxyJob(jobId: string): Promise<ProxyJob> {
    return this.request(`/v1/proxy-jobs/${encodeURIComponent(jobId)}/tick`, {
      method: "POST",
      body: "{}",
    });
  }

  completeProxyJob(
    jobId: string,
    input: {
      proxy_uri: string;
      source_mapping: ProxySourceMapping;
      encode_backend?: string;
      source_unchanged?: boolean;
      message?: string;
    },
  ): Promise<ProxyJob> {
    return this.request(`/v1/proxy-jobs/${encodeURIComponent(jobId)}/complete`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getProxyJob(jobId: string): Promise<ProxyJob> {
    return this.request(`/v1/proxy-jobs/${encodeURIComponent(jobId)}`);
  }

  listSyncSessions(projectId: string): Promise<SyncSession[]> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/sync-sessions`);
  }

  createSyncSession(projectId: string, input: CreateSyncSessionInput): Promise<SyncSession> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/sync-jobs`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getSyncSession(sessionId: string): Promise<SyncSession> {
    return this.request(`/v1/sync-sessions/${encodeURIComponent(sessionId)}`);
  }

  overrideSyncAlignment(sessionId: string, input: SyncOverrideInput): Promise<SyncSession> {
    return this.request(`/v1/sync-alignments/${encodeURIComponent(sessionId)}/override`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  attachSyncDrift(
    sessionId: string,
    input: {
      asset_id: string;
      anchors: Array<{ source_sample: number; master_sample: number; confidence: number }>;
    },
  ): Promise<SyncSession> {
    return this.request(`/v1/sync-alignments/${encodeURIComponent(sessionId)}/drift`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  attachSyncFingerprint(
    sessionId: string,
    input: {
      asset_id: string;
      algorithm_version?: string;
      landmark_count_ref: number;
      landmark_count_query: number;
      candidates: Array<{
        sample_offset: number;
        score: number;
        vote_count: number;
        note: string;
      }>;
      ambiguous?: boolean;
      note?: string;
    },
  ): Promise<SyncSession> {
    return this.request(`/v1/sync-alignments/${encodeURIComponent(sessionId)}/fingerprint`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createPreviewSession(
    projectId: string,
    input: {
      asset_id?: string;
      duration_frames?: number;
      fps_num?: number;
      fps_den?: number;
      preview_tier?: "full" | "proxy" | "thumbnail";
    } = {},
  ): Promise<PreviewSession> {
    return this.request(`/v1/projects/${encodeURIComponent(projectId)}/preview-sessions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getPreviewSession(sessionId: string): Promise<PreviewSession> {
    return this.request(`/v1/preview-sessions/${encodeURIComponent(sessionId)}`);
  }

  scrubPreview(sessionId: string, frame_index: number): Promise<PreviewSession> {
    return this.request(`/v1/preview-sessions/${encodeURIComponent(sessionId)}/scrub`, {
      method: "POST",
      body: JSON.stringify({ frame_index }),
    });
  }

  setPreviewTier(
    sessionId: string,
    preview_tier: "full" | "proxy" | "thumbnail",
  ): Promise<PreviewSession> {
    return this.request(`/v1/preview-sessions/${encodeURIComponent(sessionId)}/tier`, {
      method: "PATCH",
      body: JSON.stringify({ preview_tier }),
    });
  }
}

export interface ProxySourceMapping {
  source_uri: string;
  proxy_uri: string;
  target_height: number;
  scale_filter: string;
  timebase_policy: "preserve_source";
}

export interface SourceAsset {
  id: string;
  project_id: string;
  sha256: string;
  size_bytes: number;
  original_filename: string;
  locator_uri: string;
  media_properties: Record<string, unknown>;
  probe_backend?: string;
  proxy_uri?: string;
  proxy_mapping?: ProxySourceMapping;
  quarantined: boolean;
  quarantine_reason?: string;
  created_at: string;
}

export interface ImportSession {
  id: string;
  project_id: string;
  state: string;
  asset_ids: string[];
  updated_at: string;
  error?: string;
}

export interface ImportFileInput {
  filename: string;
  size_bytes: number;
  sha256?: string;
  locator_uri?: string;
  media_properties?: Record<string, unknown>;
}

export interface ProxyJob {
  id: string;
  project_id: string;
  asset_id: string;
  state: string;
  progress: number;
  message: string;
  target_height: number;
  encode_backend?: string;
  proxy_uri?: string;
  source_mapping?: ProxySourceMapping;
  source_unchanged?: boolean;
}

export interface PreviewSession {
  id: string;
  project_id: string;
  asset_id?: string;
  duration_frames: number;
  fps_num: number;
  fps_den: number;
  playhead_frame: number;
  generation: number;
  preview_tier: "full" | "proxy" | "thumbnail";
  last_scrub_message: string;
  updated_at: string;
}
