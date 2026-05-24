// Tiny in-memory store for the photo flow. Keeps base64 payloads out of
// expo-router params (which choke on long strings) and lets each screen pick
// up the latest source/enhanced image.

import type { ComplianceResult } from './geminiCompliance';

export interface PhotoState {
  sourceUri: string;
  photoWidth: number;
  photoHeight: number;
  // The user's photo after local crop only (pre-AI). Never overwritten by auto-fix.
  originalBase64?: string;
  // The currently-displayed photo: starts equal to originalBase64, replaced by AI output after auto-fix.
  enhancedBase64?: string;
  compliance?: ComplianceResult;
}

let state: PhotoState | null = null;

export const photoStore = {
  set(next: PhotoState) {
    state = next;
  },
  patch(partial: Partial<PhotoState>) {
    if (!state) return;
    state = { ...state, ...partial };
  },
  get(): PhotoState | null {
    return state;
  },
  clear() {
    state = null;
  },
};
