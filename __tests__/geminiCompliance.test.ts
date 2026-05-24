import {
  checkCompliance,
  countryForTemplate,
  type ComplianceResult,
} from '../utils/geminiCompliance';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

function mockFetch(response: any, init: { ok?: boolean; status?: number } = {}) {
  const fn = jest.fn().mockResolvedValue({
    ok: init.ok !== false,
    status: init.status ?? 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
  (global as any).fetch = fn;
  return fn;
}

afterEach(() => {
  (global as any).fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  else process.env.EXPO_PUBLIC_GEMINI_API_KEY = ORIGINAL_KEY;
  jest.restoreAllMocks();
});

describe('countryForTemplate', () => {
  it('maps template ids to country buckets', () => {
    expect(countryForTemplate('us-passport')).toBe('US');
    expect(countryForTemplate('eu-schengen')).toBe('EU');
    expect(countryForTemplate('china-passport')).toBe('CN');
    expect(countryForTemplate('unknown')).toBe('US');
  });
});

describe('checkCompliance', () => {
  it('returns fallback result when no API key is set', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const fetchSpy = mockFetch({});
    const r = await checkCompliance('data:image/jpeg;base64,AAA', 'US');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r.severity).toBe('warn');
    expect(r.issues[0].code).toBe('CHECK_UNAVAILABLE');
  });

  it('posts JSON with base64 image and country rules in the prompt', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    const passResponse: ComplianceResult = {
      country: 'US',
      severity: 'pass',
      summary: 'Looks good.',
      issues: [],
      metrics: {
        headHeightRatio: 0.6,
        eyeLineRatio: 0.35,
        faceCenterX: 0.5,
        backgroundUniform: true,
        expressionNeutral: true,
        eyesOpen: true,
        headStraight: true,
        lighting: 'even',
      },
      suggestedAction: 'use_as_is',
    };
    const fetchSpy = mockFetch({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(passResponse) }] } },
      ],
    });

    const r = await checkCompliance('data:image/jpeg;base64,QUFB', 'US');
    expect(r.severity).toBe('pass');
    expect(r.suggestedAction).toBe('use_as_is');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('gemini-2.5-flash-lite');
    expect(url).toContain('key=fake-key');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[1].inline_data.data).toBe('QUFB');
    expect(body.contents[0].parts[0].text).toContain('US passport');
    expect(body.generationConfig.temperature).toBe(0.1);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('strips markdown fences around the JSON response', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    const wrapped = '```json\n' + JSON.stringify({
      severity: 'warn',
      issues: [{ code: 'BG_NOT_UNIFORM', severity: 'warn', message: 'Shadows visible' }],
      suggestedAction: 'auto_fix',
    }) + '\n```';
    mockFetch({
      candidates: [{ content: { parts: [{ text: wrapped }] } }],
    });

    const r = await checkCompliance('data:image/jpeg;base64,QUFB', 'EU');
    expect(r.severity).toBe('warn');
    expect(r.issues[0].code).toBe('BG_NOT_UNIFORM');
    expect(r.suggestedAction).toBe('auto_fix');
    expect(r.country).toBe('EU');
  });

  it('normalizes unknown severity and missing fields', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    mockFetch({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ severity: 'maybe', summary: 'idk' }) }],
          },
        },
      ],
    });
    const r = await checkCompliance('data:image/jpeg;base64,QUFB', 'CN');
    expect(r.severity).toBe('warn');
    expect(r.metrics.faceCenterX).toBe(0.5);
    expect(r.metrics.lighting).toBe('even');
    expect(r.country).toBe('CN');
  });

  it('throws a friendly classified error on non-OK HTTP response (no raw JSON leakage)', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    mockFetch({ error: { message: 'bad key' } }, { ok: false, status: 403 });
    await expect(
      checkCompliance('data:image/jpeg;base64,QUFB', 'US'),
    ).rejects.toThrow(/authentication failed/i);
  });

  it('429 surfaces as a quota/busy message, not raw JSON', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    mockFetch(
      { error: { code: 429, message: 'Your prepayment credits are depleted.' } },
      { ok: false, status: 429 },
    );
    await expect(
      checkCompliance('data:image/jpeg;base64,QUFB', 'US'),
    ).rejects.toThrow(/busy.*try again/i);
  });

  it('5xx surfaces as service-unavailable, not raw JSON', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    mockFetch({ error: 'oops' }, { ok: false, status: 503 });
    await expect(
      checkCompliance('data:image/jpeg;base64,QUFB', 'US'),
    ).rejects.toThrow(/temporarily unavailable/i);
  });

  it('throws on unparseable text', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake-key';
    mockFetch({
      candidates: [{ content: { parts: [{ text: 'not json at all' }] } }],
    });
    await expect(
      checkCompliance('data:image/jpeg;base64,QUFB', 'US'),
    ).rejects.toThrow(/Compliance JSON parse failed/);
  });
});
