export const DEFAULT_TTS_PROVIDER = 'local_piper';
export const DEFAULT_TTS_VOICE_ID = 'es_ES-carlfm-x_low';
export const DEFAULT_ASPECT_RATIO = '9:16';
export const DEFAULT_FPS = 30;

export const AVAILABLE_ASPECT_RATIOS = [
  '9:16',
  '4:5',
  '3:4',
  '1:1',
  '16:9',
] as const;

export type AspectRatio = (typeof AVAILABLE_ASPECT_RATIOS)[number];
