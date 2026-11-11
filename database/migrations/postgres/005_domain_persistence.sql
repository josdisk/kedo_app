-- Hardening: persist assets / import / proxy / preview / sequences under RLS (DAT / ING / PLAY / EDT).

ALTER TABLE source_assets
  ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS original_filename TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locator_uri TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS probe_backend TEXT,
  ADD COLUMN IF NOT EXISTS proxy_uri TEXT,
  ADD COLUMN IF NOT EXISTS proxy_mapping JSONB,
  ADD COLUMN IF NOT EXISTS quarantined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;

CREATE INDEX IF NOT EXISTS source_assets_org_idx ON source_assets(organization_id);
CREATE INDEX IF NOT EXISTS source_assets_project_org_idx ON source_assets(project_id, organization_id);

CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  state TEXT NOT NULL,
  created_by TEXT NOT NULL,
  asset_ids JSONB NOT NULL DEFAULT '[]',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_sessions_project_idx
  ON import_sessions(project_id, organization_id);

CREATE TABLE IF NOT EXISTS proxy_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  asset_id TEXT NOT NULL,
  state TEXT NOT NULL,
  progress DOUBLE PRECISION NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  target_height INTEGER NOT NULL DEFAULT 720,
  encode_backend TEXT,
  proxy_uri TEXT,
  source_mapping JSONB,
  source_unchanged BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proxy_jobs_org_idx ON proxy_jobs(organization_id);

CREATE TABLE IF NOT EXISTS preview_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  asset_id TEXT,
  duration_frames BIGINT NOT NULL,
  fps_num BIGINT NOT NULL,
  fps_den BIGINT NOT NULL,
  playhead_frame BIGINT NOT NULL DEFAULT 0,
  generation BIGINT NOT NULL DEFAULT 0,
  preview_tier TEXT NOT NULL DEFAULT 'proxy',
  last_scrub_message TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS preview_sessions_org_idx ON preview_sessions(organization_id);

CREATE TABLE IF NOT EXISTS sequence_states (
  project_id TEXT NOT NULL REFERENCES projects(id),
  sequence_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  revision BIGINT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS sequence_states_org_idx ON sequence_states(organization_id);

ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_states ENABLE ROW LEVEL SECURITY;

ALTER TABLE import_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE proxy_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE preview_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE sequence_states FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS import_sessions_tenant ON import_sessions;
CREATE POLICY import_sessions_tenant ON import_sessions
  FOR ALL
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS proxy_jobs_tenant ON proxy_jobs;
CREATE POLICY proxy_jobs_tenant ON proxy_jobs
  FOR ALL
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS preview_sessions_tenant ON preview_sessions;
CREATE POLICY preview_sessions_tenant ON preview_sessions
  FOR ALL
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS sequence_states_tenant ON sequence_states;
CREATE POLICY sequence_states_tenant ON sequence_states
  FOR ALL
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON import_sessions, proxy_jobs, preview_sessions, sequence_states TO kedov_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON source_assets TO kedov_app;
