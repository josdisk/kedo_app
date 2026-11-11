export interface ProjectRecord {
  id: string;
  organization_id: string;
  name: string;
  genre: string;
  privacy_mode: string;
  schema_version: number;
  revision: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  genre: string;
  privacy_mode: string;
  revision: number;
  updated_at: string;
  organization_id: string;
}
