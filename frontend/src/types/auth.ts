// Auth TypeScript interfaces matching backend Pydantic schemas 1:1

export type UserPlan = 'free' | 'paid' | 'business';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'founder' | 'agency' | 'user' | 'admin';
  plan: UserPlan;
  is_active: boolean;
  created_at: string;
  persona?: string | null;
  referral_source?: string | null;
  use_case?: string | null;
  onboarding_completed: boolean;
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
  persona?: string | null;
  referral_source?: string | null;
  use_case?: string | null;
  mark_onboarding_completed?: boolean;
}

// ---------------------------------------------------------------------------
// Voice — matches backend Pydantic VoiceResponse schema 1:1 (snake_case)
// ---------------------------------------------------------------------------

export interface BackendVoice {
  id: string;
  user_id: string;
  name: string;
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

// ---------------------------------------------------------------------------
// API Keys & LLM Settings — matches backend Pydantic schemas 1:1
// ---------------------------------------------------------------------------

export type ApiKeyProvider = 'gemini' | 'openai' | 'anthropic' | 'grok' | 'groq';

export interface ApiKeyEntry {
  id: string;
  provider: ApiKeyProvider;
  is_active: boolean;
  created_at: string;
  api_key_last_four?: string;
}

export interface ApiKeyCreateRequest {
  provider: ApiKeyProvider;
  api_key: string;
}

export interface UserLLMSettings {
  default_provider: string | null;
  default_model: string | null;
  available_models: string[];
}

export interface UserLLMSettingsUpdate {
  default_provider?: string | null;
  default_model?: string | null;
  available_models?: string[];
}

// Modelos que SOLO se ofrecen a usuarios admin/founder (experimentales/internos).
// Se añaden a AVAILABLE_MODELS únicamente si el usuario tiene rol privilegiado.
export const ADMIN_ONLY_MODELS: Record<string, string[]> = {
  gemini: ['gemma-4-31b-it'],
};

export const AVAILABLE_MODELS: Record<string, string[]> = {
  gemini: [
    'gemini-3.5-flash',
    'gemini-3.1-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.1-pro',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'o1',
    'o1-mini',
    'o3-mini',
  ],
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-haiku-3-20250514',
  ],
  grok: [
    'grok-3',
    'grok-3-mini',
    'grok-4',
  ],
};

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Claude',
  grok: 'Grok',
  groq: 'Groq',
};
