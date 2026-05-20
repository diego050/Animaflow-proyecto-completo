export interface SFX {
  keyword: string;
  time_in_seconds: number;
  file: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface Spec {
  start_time_seconds: number;
  duration_seconds: number;
  text: string;
  type: string;
  media_query: string;
  remotion_props: Record<string, unknown>;
  sfx: SFX[];
  audio_url?: string;
  word_timestamps?: WordTimestamp[];
}

export interface TimelineSpec {
  scenes: Spec[];
  aspect_ratio?: string;
}
