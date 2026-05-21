// Job-related TypeScript interfaces matching backend Pydantic schemas 1:1
import type { TimelineSpec } from './spec';

export interface JobSummary {
  job_id: string;
  status: string;
  script_text: string;
  video_url: string | null;
  created_at: string;
  aspect_ratio?: string;
}

export interface JobDetail {
  job_id: string;
  status: string;
  result_spec: TimelineSpec | null;
  video_url: string | null;
}

export interface JobCreateRequest {
  script_text: string;
  aspect_ratio: string;
  tts_provider?: string;
  tts_voice_id?: string;
  tts_api_key?: string | null;
}

export interface JobCreateResponse {
  job_id: string;
  status: string;
}

export interface ScriptGenerateRequest {
  info: string;
  template_id?: string;
  custom_prompt?: string | null;
  target_duration_seconds?: number;
}

export interface ScriptGenerateResponse {
  script_text: string;
}

export interface SceneRegenerateRequest {
  media_query: string;
  text: string;
}

export interface SceneRegenerateResponse {
  status: string;
  result_spec: TimelineSpec | null;
}

export interface SceneData {
  text: string;
  media_query: string;
  start_time_seconds: number;
  duration_seconds: number;
}

export interface SceneApproveRequest {
  scenes: SceneData[];
}

export interface SceneApproveResponse {
  job_id: string;
  status: string;
  result_spec: TimelineSpec | null;
}

// Status type guard helpers
export const PROCESSING_STATUSES = [
  'pending',
  'segmenting',
  'segmented',
  'visuals_generating',
  'processing_scenes',
] as const;

export const RENDER_STATUSES = [
  'queued_render',
  'rendering',
] as const;

export const COMPLETED_STATUSES = [
  'completed',
  'completed_video',
] as const;

export const FAILED_STATUSES = [
  'failed',
  'failed_render',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];
export type RenderStatus = (typeof RENDER_STATUSES)[number];
export type CompletedStatus = (typeof COMPLETED_STATUSES)[number];
export type FailedStatus = (typeof FAILED_STATUSES)[number];

export function isProcessingStatus(status: string): status is ProcessingStatus {
  return (PROCESSING_STATUSES as readonly string[]).includes(status);
}

export function isRenderStatus(status: string): status is RenderStatus {
  return (RENDER_STATUSES as readonly string[]).includes(status);
}

export function isCompletedStatus(status: string): status is CompletedStatus {
  return (COMPLETED_STATUSES as readonly string[]).includes(status);
}

export function isFailedStatus(status: string): status is FailedStatus {
  return (FAILED_STATUSES as readonly string[]).includes(status);
}

export function isTerminalStatus(status: string): boolean {
  return isCompletedStatus(status) || isFailedStatus(status);
}

// ---------------------------------------------------------------------------
// Sprint 3-4: Voices, Scripts, Settings
// ---------------------------------------------------------------------------

import type { BackendVoice } from './auth';

export interface Voice {
  id: string;
  name: string;
  isDefault: boolean;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  createdAt: string;
  /** @deprecated Frontend-only field. Backend does not track usage. Roadmap v2. */
  projectsUsed: number;
  /** @deprecated Frontend-only field. Backend does not provide preview URLs yet. Roadmap v2. */
  previewAudioUrl?: string;
  audioSamplePath?: string | null;
  isActive?: boolean;
}

/** Map backend snake_case VoiceResponse → frontend camelCase Voice */
export function mapBackendVoice(bv: BackendVoice): Voice {
  return {
    id: bv.id,
    name: bv.name,
    isDefault: bv.is_default,
    gender: bv.gender,
    language: bv.language,
    createdAt: bv.created_at,
    projectsUsed: 0, // Backend doesn't track this yet; default to 0
    audioSamplePath: bv.audio_sample_path,
    isActive: bv.is_active,
  };
}

export interface Script {
  id: string;
  name: string;
  content: string;
  scenes: number;
  aspectRatio: string;
  createdAt: string;
  sourceJobId?: string;
}

export interface UserSettings {
  defaultAspectRatio: string;
  defaultVoiceId: string;
  language: string;
  theme: string;
  name: string;
  email: string;
  ttsProvider?: string;
  ttsVoiceId?: string;
  ttsApiKey?: string;
}

export const AVAILABLE_TTS_PROVIDERS = [
  { id: 'local_piper', name: 'Voz Local (Piper) — Carl (Español) — Gratis, más lento', requiresKey: false },
  { id: 'elevenlabs', name: 'ElevenLabs - Mejor calidad', requiresKey: true },
  { id: 'google_tts', name: 'Google Cloud TTS - Económico', requiresKey: true },
  { id: 'gemini_tts', name: 'Gemini TTS - Experimental', requiresKey: true },
] as const;

export type TTSProviderId = (typeof AVAILABLE_TTS_PROVIDERS)[number]['id'];
