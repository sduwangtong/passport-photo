// End-to-end flow test: user picks photo -> selects country -> compliance
// check verdict (mocked) -> auto-fix path -> tile generation produces print
// HTML with the AI-enhanced image embedded.
//
// Exercises every pure boundary the real app crosses, with fetch mocked.

import { photoStore } from '../utils/photoStore';
import { checkCompliance, countryForTemplate } from '../utils/geminiCompliance';
import { processWithAI } from '../utils/aiProcessor';
import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';
import { generatePrintHTML } from '../utils/printGenerator';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

afterEach(() => {
  (global as any).fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  else process.env.EXPO_PUBLIC_GEMINI_API_KEY = ORIGINAL_KEY;
  photoStore.clear();
});

function makeFetchSequence(...responses: Array<{ body: any; ok?: boolean }>) {
  let i = 0;
  return jest.fn().mockImplementation(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return {
      ok: r.ok !== false,
      status: r.ok === false ? 500 : 200,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  });
}

describe('compliance flow integration', () => {
  it('happy path: photo passes compliance, tile HTML uses original base64', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake';
    (global as any).fetch = makeFetchSequence({
      body: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    severity: 'pass',
                    summary: 'Good',
                    issues: [],
                    metrics: {
                      headHeightRatio: 0.65,
                      eyeLineRatio: 0.4,
                      faceCenterX: 0.5,
                      backgroundUniform: true,
                      expressionNeutral: true,
                      eyesOpen: true,
                      headStraight: true,
                      lighting: 'even',
                    },
                    suggestedAction: 'use_as_is',
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    photoStore.set({ sourceUri: 'file:///pick.jpg', photoWidth: 1200, photoHeight: 1600 });

    const template = templates.find((t) => t.id === 'us-passport')!;
    const paper = paperSizes[0];
    const country = countryForTemplate(template.id);
    const base = 'data:image/jpeg;base64,SOURCE';

    const verdict = await checkCompliance(base, country);
    expect(verdict.severity).toBe('pass');
    expect(verdict.suggestedAction).toBe('use_as_is');

    photoStore.patch({ enhancedBase64: base, compliance: verdict });

    const html = generatePrintHTML(base, template, paper);
    expect(html).toContain(base);
    expect(html).toContain('@page');
  });

  it('fail path: compliance fails, user runs auto-fix, second check passes', async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'fake';
    (global as any).fetch = makeFetchSequence(
      // 1st call: compliance check -> fail
      {
        body: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      severity: 'fail',
                      summary: 'Background uneven, head off-center',
                      issues: [
                        { code: 'BG_NOT_UNIFORM', severity: 'fail', message: 'Shadows on background' },
                        { code: 'HEAD_NOT_CENTERED', severity: 'warn', message: 'Head leans left' },
                      ],
                      suggestedAction: 'auto_fix',
                    }),
                  },
                ],
              },
            },
          ],
        },
      },
      // 2nd call: AI enhance -> returns image
      {
        body: {
          candidates: [
            {
              content: {
                parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'ENHANCED' } }],
              },
            },
          ],
        },
      },
      // 3rd call: re-check -> pass
      {
        body: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      severity: 'pass',
                      summary: 'Fixed',
                      issues: [],
                      suggestedAction: 'use_as_is',
                    }),
                  },
                ],
              },
            },
          ],
        },
      },
    );

    const template = templates.find((t) => t.id === 'eu-schengen')!;
    const country = countryForTemplate(template.id);

    const verdict1 = await checkCompliance('data:image/jpeg;base64,ORIG', country);
    expect(verdict1.severity).toBe('fail');
    expect(verdict1.suggestedAction).toBe('auto_fix');

    const enhanced = await processWithAI(
      'data:image/jpeg;base64,ORIG',
      template.name,
      template.widthMM,
      template.heightMM,
    );
    expect(enhanced).toBe('data:image/jpeg;base64,ENHANCED');

    const verdict2 = await checkCompliance(enhanced, country);
    expect(verdict2.severity).toBe('pass');

    const html = generatePrintHTML(enhanced, template, paperSizes[1]);
    expect(html).toContain('ENHANCED');
  });

  it('flow respects the constrained country set (US/EU/CN only)', () => {
    expect(templates.map((t) => t.id).sort()).toEqual([
      'china-passport',
      'eu-schengen',
      'us-passport',
    ]);
  });
});
