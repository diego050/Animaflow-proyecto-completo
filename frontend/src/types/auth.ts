// Auth TypeScript interfaces matching backend Pydantic schemas 1:1

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'founder' | 'agency' | 'pilot';
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}

// ---------------------------------------------------------------------------
// Voice — matches backend Pydantic VoiceResponse schema 1:1 (snake_case)
// ---------------------------------------------------------------------------

export interface BackendVoice {
  id: string;
  user_id: string;
  name: string;
  voicebox_profile_id: string | null;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  is_default: boolean;
  is_active: boolean;
  audio_sample_path: string | null;
  created_at: string;
  updated_at: string;
}

// Preview response from POST /api/voices/{id}/preview
export interface VoicePreviewResponse {
  audio_url: string;
  duration: number;
}
