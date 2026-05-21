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
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  total_jobs: number;
  completed_jobs: number;
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
  redis_connected: boolean;
  redis_queue_length: number;
  workers_active: number;
  workers_idle: number;
  workers_connected: boolean;
  database_connected: boolean;
  database_pool_size: number;
  database_pool_used: number;
  uptime_seconds: number;
  last_worker_heartbeat: string | null;
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
