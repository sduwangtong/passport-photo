import { photoStore } from '../utils/photoStore';

describe('photoStore', () => {
  beforeEach(() => photoStore.clear());

  it('starts empty', () => {
    expect(photoStore.get()).toBeNull();
  });

  it('set/get round-trips state', () => {
    photoStore.set({ sourceUri: 'file:///a.jpg', photoWidth: 600, photoHeight: 800 });
    expect(photoStore.get()).toEqual({
      sourceUri: 'file:///a.jpg',
      photoWidth: 600,
      photoHeight: 800,
    });
  });

  it('patch merges into existing state', () => {
    photoStore.set({ sourceUri: 'file:///a.jpg', photoWidth: 600, photoHeight: 800 });
    photoStore.patch({ enhancedBase64: 'data:image/jpeg;base64,XXX' });
    expect(photoStore.get()?.enhancedBase64).toBe('data:image/jpeg;base64,XXX');
    expect(photoStore.get()?.sourceUri).toBe('file:///a.jpg');
  });

  it('patch is a no-op when state is empty', () => {
    photoStore.patch({ enhancedBase64: 'data:image/jpeg;base64,ZZZ' });
    expect(photoStore.get()).toBeNull();
  });

  it('clear resets state', () => {
    photoStore.set({ sourceUri: 'file:///a.jpg', photoWidth: 1, photoHeight: 1 });
    photoStore.clear();
    expect(photoStore.get()).toBeNull();
  });

  it('persists originalBase64 separately from enhancedBase64', () => {
    photoStore.set({ sourceUri: 'file:///a.jpg', photoWidth: 1, photoHeight: 1 });
    photoStore.patch({
      originalBase64: 'data:image/jpeg;base64,ORIG',
      enhancedBase64: 'data:image/jpeg;base64,ORIG',
    });
    // Simulate auto-fix that only replaces enhanced.
    photoStore.patch({ enhancedBase64: 'data:image/jpeg;base64,FIXED' });
    expect(photoStore.get()?.originalBase64).toBe('data:image/jpeg;base64,ORIG');
    expect(photoStore.get()?.enhancedBase64).toBe('data:image/jpeg;base64,FIXED');
  });
});
