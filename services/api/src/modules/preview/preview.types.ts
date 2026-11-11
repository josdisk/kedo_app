export interface PreviewSession {
  id: string;
  project_id: string;
  organization_id: string;
  asset_id?: string;
  duration_frames: number;
  fps_num: number;
  fps_den: number;
  playhead_frame: number;
  generation: number;
  preview_tier: "full" | "proxy" | "thumbnail";
  last_scrub_message: string;
  created_at: string;
  updated_at: string;
}
