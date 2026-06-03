/**
 * fitText — Calculate the optimal fontSize for text to fit within a container.
 *
 * Uses binary search to find the largest fontSize that allows the text
 * to fit within the given pixel dimensions. All measurements are in
 * absolute pixels (no viewport units, no percentages).
 *
 * @param text - The text string to fit
 * @param containerWidth - Available width in pixels (absolute)
 * @param containerHeight - Available height in pixels (absolute)
 * @param options - Configuration options
 * @returns Optimal fontSize, lineHeight, and estimated line count
 *
 * @example
 * ```ts
 * const fitted = fitText("Hello world, this is a long text", 900, 600, {
 *   minFontSize: 36,
 *   maxFontSize: 96,
 *   fontWeight: 900,
 * });
 * // fitted.fontSize might be 48 instead of 96
 * ```
 */
export function fitText(
  text: string,
  containerWidth: number,
  containerHeight: number,
  options: {
    minFontSize?: number;
    maxFontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    padding?: number;
  } = {}
): { fontSize: number; lineHeight: number; estimatedLines: number } {
  const {
    minFontSize = 24,
    maxFontSize = 120,
    fontWeight = 900,
    lineHeight = 1.3,
    padding = 40,
  } = options;

  // Guard: empty text or invalid dimensions
  if (!text || containerWidth <= 0 || containerHeight <= 0) {
    return { fontSize: minFontSize, lineHeight, estimatedLines: 1 };
  }

  const effectiveWidth = containerWidth - padding * 2;
  const effectiveHeight = containerHeight - padding * 2;

  // Estimate average character width based on fontSize and fontWeight.
  // Bold/heavy fonts are ~0.6x fontSize wide on average.
  // Regular fonts are ~0.5x fontSize wide.
  const charWidthRatio = fontWeight >= 700 ? 0.6 : 0.5;

  // Binary search for the largest fontSize that fits
  let low = minFontSize;
  let high = maxFontSize;
  let bestFontSize = minFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const charWidth = mid * charWidthRatio;
    const charsPerLine = Math.max(1, Math.floor(effectiveWidth / charWidth));
    const lineCount = Math.ceil(text.length / charsPerLine);
    const totalHeight = lineCount * mid * lineHeight;

    if (totalHeight <= effectiveHeight && charsPerLine >= 3) {
      // This fontSize fits — try larger
      bestFontSize = mid;
      low = mid + 1;
    } else {
      // Too large — try smaller
      high = mid - 1;
    }
  }

  // Calculate final metrics at bestFontSize
  const charWidth = bestFontSize * charWidthRatio;
  const charsPerLine = Math.max(1, Math.floor(effectiveWidth / charWidth));
  const estimatedLines = Math.ceil(text.length / charsPerLine);

  return {
    fontSize: bestFontSize,
    lineHeight,
    estimatedLines,
  };
}

/**
 * Quick check: will this text overflow at the given fontSize and width?
 * Returns true if the text is estimated to exceed the container width.
 */
export function willTextOverflow(
  text: string,
  fontSize: number,
  containerWidth: number,
  fontWeight: number = 900,
): boolean {
  const charWidthRatio = fontWeight >= 700 ? 0.6 : 0.5;
  const charWidth = fontSize * charWidthRatio;
  const estimatedWidth = text.length * charWidth;
  return estimatedWidth > containerWidth;
}
