import { chooseDisplayedPhoto, canCompare, toggleMode } from '../utils/compareView';

describe('chooseDisplayedPhoto', () => {
  it('returns enhanced when mode is enhanced and both exist', () => {
    expect(
      chooseDisplayedPhoto({ mode: 'enhanced', original: 'A', enhanced: 'B' }),
    ).toBe('B');
  });

  it('returns original when mode is original and both exist', () => {
    expect(
      chooseDisplayedPhoto({ mode: 'original', original: 'A', enhanced: 'B' }),
    ).toBe('A');
  });

  it('falls back to the other when current side is missing', () => {
    expect(chooseDisplayedPhoto({ mode: 'original', enhanced: 'B' })).toBe('B');
    expect(chooseDisplayedPhoto({ mode: 'enhanced', original: 'A' })).toBe('A');
  });

  it('returns null when neither exists', () => {
    expect(chooseDisplayedPhoto({ mode: 'enhanced' })).toBeNull();
  });
});

describe('canCompare', () => {
  it('is false when either side is missing', () => {
    expect(canCompare(undefined, 'B')).toBe(false);
    expect(canCompare('A', undefined)).toBe(false);
    expect(canCompare()).toBe(false);
  });

  it('is false when both sides are identical (no auto-fix applied yet)', () => {
    expect(canCompare('SAME', 'SAME')).toBe(false);
  });

  it('is true when both differ (post auto-fix)', () => {
    expect(canCompare('ORIG', 'FIXED')).toBe(true);
  });
});

describe('toggleMode', () => {
  it('flips original to enhanced and back', () => {
    expect(toggleMode('original')).toBe('enhanced');
    expect(toggleMode('enhanced')).toBe('original');
  });
});
