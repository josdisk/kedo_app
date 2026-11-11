-- R0 baseline migration (DAT / §11.3).
-- TEXT tenant/entity IDs match Nest demo + OIDC string subjects (no UUID-only trap).

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'generic',
  privacy_mode TEXT NOT NULL DEFAULT 'local_first',
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision BIGINT NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX projects_org_idx ON projects(organization_id, updated_at DESC);

CREATE TABLE source_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  sha256 CHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  media_properties JSONB NOT NULL DEFAULT '{}',
  source_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, sha256)
);

CREATE TABLE sequence_operations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  sequence_id TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  actor_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  inverse_payload JSONB NOT NULL,
  checksum CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, revision)
);

CREATE INDEX operations_project_idx ON sequence_operations(project_id, created_at);
