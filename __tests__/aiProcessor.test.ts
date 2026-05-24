import { processWithAI } from '../utils/aiProcessor';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

afterEach(() => {
  (global as any).fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  else process.env.EXPO_PUBLIC_GEMINI_API_KEY = ORIGINAL_KEY;
});

describe('processWithAI', () => {
  it('returns the AI-generated image as data URL (camelCase response, live shape)', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: 'image/png', data: 'BBB' } }],
            },
          },
        ],
      }),
      text: async () => '',
    });
    (global as any).fetch = fetchSpy;
    const out = await processWithAI('data:image/jpeg;base64,QUFB', 'United States', 51, 51);
    expect(out).toBe('data:image/png;base64,BBB');

    // Verify the URL is generativelanguage, not aiplatform.
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).not.toContain('aiplatform');
    expect(url).toContain('gemini-2.5-flash-image');
  });

  it('also accepts snake_case responses for resilience', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'CCC' } }],
            },
          },
        ],
      }),
      text: async () => '',
    });
    const out = await processWithAI('data:image/jpeg;base64,QUFB', 'China', 33, 48);
    expect(out).toBe('data:image/jpeg;base64,CCC');
  });

  it('throws when API does not return an image part', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'oops' }] } }] }),
      text: async () => '',
    });
    await expect(
      processWithAI('data:image/jpeg;base64,QUFB', 'United States', 51, 51),
    ).rejects.toThrow(/did not return an image/);
  });

  it('throws a friendly classified-style error on non-OK HTTP response', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
      text: async () => '{"error":"quota"}',
    });
    await expect(
      processWithAI('data:image/jpeg;base64,QUFB', 'United States', 51, 51),
    ).rejects.toThrow(/AI generator returned 429/);
  });
});
