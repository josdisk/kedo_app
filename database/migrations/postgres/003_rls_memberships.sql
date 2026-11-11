-- Hardening: tenant memberships + row-level security (DAT / SVC).
-- App must SET LOCAL app.current_org_id / app.current_user_id per request.
-- Never grant table bypass to the application role in production.

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON organization_memberships(user_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE source_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE sequence_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_alignments FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_member_select ON organizations;
CREATE POLICY organizations_member_select ON organizations
  FOR SELECT
  USING (id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS organizations_insert_self ON organizations;
CREATE POLICY organizations_insert_self ON organizations
  FOR INSERT
  WITH CHECK (id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS memberships_self_select ON organization_memberships;
CREATE POLICY memberships_self_select ON organization_memberships
  FOR SELECT
  USING (
    organization_id = nullif(current_setting('app.current_org_id', true), '')
    AND user_id = nullif(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS memberships_self_insert ON organization_memberships;
CREATE POLICY memberships_self_insert ON organization_memberships
  FOR INSERT
  WITH CHECK (
    organization_id = nullif(current_setting('app.current_org_id', true), '')
    AND user_id = nullif(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS projects_tenant_select ON projects;
CREATE POLICY projects_tenant_select ON projects
  FOR SELECT
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS projects_tenant_insert ON projects;
CREATE POLICY projects_tenant_insert ON projects
  FOR INSERT
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS projects_tenant_update ON projects;
CREATE POLICY projects_tenant_update ON projects
  FOR UPDATE
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS projects_tenant_delete ON projects;
CREATE POLICY projects_tenant_delete ON projects
  FOR DELETE
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS source_assets_via_project_select ON source_assets;
CREATE POLICY source_assets_via_project_select ON source_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = source_assets.project_id
        AND p.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  );

DROP POLICY IF EXISTS source_assets_via_project_mutate ON source_assets;
CREATE POLICY source_assets_via_project_mutate ON source_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = source_assets.project_id
        AND p.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = source_assets.project_id
        AND p.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  );

DROP POLICY IF EXISTS sequence_operations_via_project ON sequence_operations;
CREATE POLICY sequence_operations_via_project ON sequence_operations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sequence_operations.project_id
        AND p.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sequence_operations.project_id
        AND p.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  );

DROP POLICY IF EXISTS sync_sessions_tenant ON sync_sessions;
CREATE POLICY sync_sessions_tenant ON sync_sessions
  FOR ALL
  USING (organization_id = nullif(current_setting('app.current_org_id', true), ''))
  WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS sync_alignments_via_session ON sync_alignments;
CREATE POLICY sync_alignments_via_session ON sync_alignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sync_sessions s
      WHERE s.id = sync_alignments.session_id
        AND s.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sync_sessions s
      WHERE s.id = sync_alignments.session_id
        AND s.organization_id = nullif(current_setting('app.current_org_id', true), '')
    )
  );
