/** Portable tenant / RLS policy intent (DAT / SVC) — mirrors 003_rls_memberships.sql. */

export type MembershipRole = "owner" | "editor" | "viewer";

export interface TenantActor {
  user_id: string;
  org_id: string;
}

export interface OrgMembership {
  organization_id: string;
  user_id: string;
  role: MembershipRole;
}

export interface ProjectRow {
  id: string;
  organization_id: string;
}

export interface AssetRow {
  id: string;
  project_id: string;
}

/** Whether actor may see/mutate a project under org-scoped RLS. */
export function canAccessProject(
  actor: TenantActor,
  project: ProjectRow,
  memberships: OrgMembership[],
): boolean {
  if (!actor.org_id || !actor.user_id) return false;
  if (project.organization_id !== actor.org_id) return false;
  return memberships.some(
    (m) => m.organization_id === actor.org_id && m.user_id === actor.user_id,
  );
}

/** Asset access via owning project org (join policy). */
export function canAccessAsset(
  actor: TenantActor,
  asset: AssetRow,
  projects: ProjectRow[],
  memberships: OrgMembership[],
): boolean {
  const project = projects.find((p) => p.id === asset.project_id);
  if (!project) return false;
  return canAccessProject(actor, project, memberships);
}

/** Viewer cannot mutate; editor/owner can. */
export function canMutateInOrg(
  actor: TenantActor,
  memberships: OrgMembership[],
): boolean {
  const m = memberships.find(
    (x) => x.organization_id === actor.org_id && x.user_id === actor.user_id,
  );
  return Boolean(m && (m.role === "owner" || m.role === "editor"));
}

/** SQL snippets that must appear in the RLS migration (CI guard). */
export const REQUIRED_RLS_MARKERS = [
  "ENABLE ROW LEVEL SECURITY",
  "FORCE ROW LEVEL SECURITY",
  "organization_memberships",
  "app.current_org_id",
  "app.current_user_id",
  "organizations_insert_self",
  "memberships_self_insert",
  "projects_tenant_select",
  "source_assets_via_project",
  "sync_sessions_tenant",
] as const;
