export type ImportSessionState =
  | "CREATED"
  | "UPLOADING"
  | "VALIDATING"
  | "PROBING"
  | "READY"
  | "QUARANTINED"
  | "FAILED"
  | "CANCELLED";

export type ProxyJobState = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface SourceAsset {
  id: string;
  project_id: string;
  organization_id: string;
  sha256: string;
  size_bytes: number;
  original_filename: string;
  locator_uri: string;
  media_properties: Record<string, unknown>;
  probe_backend?: string;
  /** Derived proxy only — never overwrites sha256 / locator_uri (DAT-002). */
  proxy_uri?: string;
  proxy_mapping?: ProxySourceMapping;
  quarantined: boolean;
  quarantine_reason?: string;
  created_at: string;
}

export interface ProxySourceMapping {
  source_uri: string;
  proxy_uri: string;
  target_height: number;
  scale_filter: string;
  timebase_policy: "preserve_source";
}

export interface ImportSession {
  id: string;
  project_id: string;
  organization_id: string;
  state: ImportSessionState;
  created_by: string;
  created_at: string;
  updated_at: string;
  asset_ids: string[];
  error?: string;
}

export interface ProxyJob {
  id: string;
  project_id: string;
  organization_id: string;
  asset_id: string;
  state: ProxyJobState;
  progress: number;
  message: string;
  target_height: number;
  encode_backend?: string;
  proxy_uri?: string;
  source_mapping?: ProxySourceMapping;
  source_unchanged?: boolean;
  created_at: string;
  updated_at: string;
}
