import { AbsoluteFill, Audio } from 'remotion';
import { CustomCode } from './CustomCode';

/**
 * Igual que CustomCode pero además reproduce el audio de la escena. La usa el export de
 * FOOTAGE para After Effects (compositionId="CustomCodeAudio") para que cada .mov por escena
 * incluya su voz. Si no hay `audioSrc`, se comporta como CustomCode (video sin audio).
 */
export const CustomCodeAudio: React.FC<{
  code: string;
  audioSrc?: string;
  durationInFrames?: number;
  width?: number;
  height?: number;
  fallbackText?: string;
  fallbackBg?: string;
}> = ({ code, audioSrc, durationInFrames, width, height, fallbackText, fallbackBg }) => {
  return (
    <AbsoluteFill>
      <CustomCode
        code={code}
        durationInFrames={durationInFrames}
        width={width}
        height={height}
        fallbackText={fallbackText}
        fallbackBg={fallbackBg}
      />
      {audioSrc ? <Audio src={audioSrc} /> : null}
    </AbsoluteFill>
  );
};
