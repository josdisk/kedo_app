export interface SyncTake {
  take_id: string;
  label: string;
  recorded_at_ms?: number;
}

export interface SyncAngle {
  angle_id: string;
  take_id: string;
  asset_id: string;
  camera_label: string;
}

export interface AlignmentHypothesis {
  sample_offset: number;
  confidence: number;
  peak_correlation: number;
  note: string;
}

export interface AffineSegment {
  source_start: number;
  source_end: number;
  master_start: number;
  slope_num: number;
  slope_den: number;
  uncertainty_samples: number;
}

export interface DriftMap {
  segments: AffineSegment[];
  note: string;
  mean_abs_residual: number;
  has_drift: boolean;
}

export interface FingerprintCandidate {
  sample_offset: number;
  score: number;
  vote_count: number;
  note: string;
}

export interface FingerprintSummary {
  algorithm_version: string;
  landmark_count_ref: number;
  landmark_count_query: number;
  candidates: FingerprintCandidate[];
  ambiguous: boolean;
  note: string;
}

export interface ClipAlignment {
  asset_id: string;
  take_id: string;
  angle_id: string;
  sample_offset: number;
  confidence: number;
  peak_correlation: number;
  frame_error_approx: number;
  ambiguous: boolean;
  user_override: boolean;
  note: string;
  alternates: AlignmentHypothesis[];
  drift_map?: DriftMap;
  fingerprint?: FingerprintSummary;
}

export interface SyncSessionRecord {
  session_id: string;
  project_id: string;
  organization_id: string;
  master_asset_id: string;
  algorithm_version: string;
  sample_rate: number;
  fps_num: number;
  fps_den: number;
  created_at: string;
  updated_at: string;
  takes: SyncTake[];
  angles: SyncAngle[];
  alignments: ClipAlignment[];
}
