export interface SFX {
  keyword: string;
  time_in_seconds: number;
  file: string;
}

export interface Spec {
  start_time_seconds: number;
  duration_seconds: number;
  text: string;
  type: string;
  media_query: string;
  remotion_props: Record<string, any>;
  sfx: SFX[];
  audio_url?: string;
}

export interface TimelineSpec {
  scenes: Spec[];
}
