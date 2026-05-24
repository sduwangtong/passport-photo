import { ISSUE_REMEDIATIONS, remediationFor } from '../utils/geminiCompliance';

// Every code listed in the compliance prompt must have a remediation string.
// If you add a new code to the prompt, add it here too.
const PROMPT_CODES = [
  'BG_NOT_WHITE',
  'BG_NOT_UNIFORM',
  'SHADOW_ON_FACE',
  'SHADOW_ON_BG',
  'HEAD_TOO_SMALL',
  'HEAD_TOO_LARGE',
  'HEAD_NOT_CENTERED',
  'HEAD_TILTED',
  'EYES_CLOSED',
  'EYES_NOT_VISIBLE',
  'GLASSES',
  'HAT',
  'EXPRESSION_NOT_NEUTRAL',
  'BLURRY',
  'OVEREXPOSED',
  'UNDEREXPOSED',
  'RED_EYE',
  'MULTIPLE_FACES',
  'NO_FACE',
  'LOW_RESOLUTION',
];

describe('issue remediations', () => {
  it('every prompt-known code has a remediation string', () => {
    for (const code of PROMPT_CODES) {
      expect(ISSUE_REMEDIATIONS[code]).toBeDefined();
      expect(ISSUE_REMEDIATIONS[code].length).toBeGreaterThan(15);
    }
  });

  it('remediationFor falls back to a default for unknown codes', () => {
    const out = remediationFor('SOME_NEW_CODE');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('CHECK_UNAVAILABLE has its own remediation', () => {
    expect(ISSUE_REMEDIATIONS.CHECK_UNAVAILABLE).toBeDefined();
  });

  it('every remediation is one short sentence (under 100 chars)', () => {
    for (const [code, msg] of Object.entries(ISSUE_REMEDIATIONS)) {
      expect(msg.length).toBeLessThan(100);
      // Avoid jargon — should not contain the issue code itself.
      expect(msg).not.toContain(code);
    }
  });
});
