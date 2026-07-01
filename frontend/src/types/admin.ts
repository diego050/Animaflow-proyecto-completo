export interface AdminStats {
  total_users: number;
  active_users: number;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  rendering_jobs: number;
  pending_jobs: number;
  total_storage_mb: number;
  avg_render_time_seconds: number;
  success_rate: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: 'founder' | 'agency' | 'user' | 'admin';
  plan: 'free' | 'paid' | 'business';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  total_jobs: number;
  completed_jobs: number;
  persona?: string | null;
}

export interface AdminJobDetail {
  job_id: string;
  user_id: string;
  user_email: string;
  status: string;
  script_text: string;
  aspect_ratio: string;
  created_at: string;
  completed_at: string | null;
  video_url: string | null;
  error_message: string | null;
}

export interface SystemHealth {
  database_connected: boolean;
  database_pool_size: number;
  database_pool_used: number;
  render_server_connected: boolean;
  render_server_url: string;
  render_server_detail: string;
  storage_ok: boolean;
  storage_detail: string;
  uptime_seconds: number;
  status: string;
}

export interface AdminSettingsConfig {
  max_concurrent_renders: number;
  default_aspect_ratio: string;
  max_script_length: number;
  max_video_duration_seconds: number;
  enable_sfx: boolean;
  enable_llm_correction: boolean;
  default_llm_provider: string;
  default_tts_provider: string;
  storage_retention_days: number;
}

export interface AdminSettingsUpdate {
  max_concurrent_renders?: number;
  default_aspect_ratio?: string;
  max_script_length?: number;
  max_video_duration_seconds?: number;
  enable_sfx?: boolean;
  enable_llm_correction?: boolean;
  default_llm_provider?: string;
  default_tts_provider?: string;
  storage_retention_days?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'founder' | 'agency' | 'user' | 'admin';
  plan: 'free' | 'paid' | 'business';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  total_jobs: number;
  completed_jobs: number;
  persona?: string | null;
}

export interface AdminJob {
  job_id: string;
  user_id: string;
  user_email: string;
  status: string;
  script_text: string;
  aspect_ratio: string;
  created_at: string;
  completed_at: string | null;
  video_url: string | null;
  error_message: string | null;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

export interface PaginatedJobsResponse {
  jobs: AdminJob[];
  total: number;
  page: number;
  per_page: number;
}
