/**
 * How long a speech bubble stays on screen for a given text.
 *
 * Base 3 s, plus 80 ms per character beyond the first 10. The baseline of 10
 * free characters keeps short utterances like "累了？" at 3 s flat, while
 * long reminder text gets enough time to be read. Callers that want to time
 * follow-up actions (e.g. "walk the pet back home after the bubble closes")
 * should use this same function instead of duplicating the formula.
 */
export function estimateSpeechDurationMs(text: string): number {
  const extraChars = Math.max(0, text.length - 10)
  return 3000 + extraChars * 80
}
