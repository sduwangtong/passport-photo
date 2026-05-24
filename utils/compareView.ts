// Pure logic for the compliance before/after view, factored out so it's testable
// without a React Native renderer.

export type CompareMode = 'original' | 'enhanced';

export interface CompareInputs {
  mode: CompareMode;
  original?: string;
  enhanced?: string;
}

/** Picks the data URL to display given the current toggle state and what's stored. */
export function chooseDisplayedPhoto({ mode, original, enhanced }: CompareInputs): string | null {
  if (mode === 'original') return original ?? enhanced ?? null;
  return enhanced ?? original ?? null;
}

/**
 * Returns true only when comparing makes sense: both versions exist AND they
 * actually differ (so we don't show a "Before / After" toggle that swaps to
 * the same photo).
 */
export function canCompare(original?: string, enhanced?: string): boolean {
  if (!original || !enhanced) return false;
  return original !== enhanced;
}

export function toggleMode(mode: CompareMode): CompareMode {
  return mode === 'original' ? 'enhanced' : 'original';
}
