// Passport-photo compliance scorer.
// Mirrors the milkTeaTracker receipt-scan pattern: gemini-2.5-flash-lite on
// generativelanguage.googleapis.com, temperature 0.1, JSON-only output, key as
// query param. Returns a structured verdict against the selected country's rules.

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

function getApiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
}

export type Country = 'US' | 'EU' | 'CN';
export type Severity = 'pass' | 'warn' | 'fail';
export type SuggestedAction = 'use_as_is' | 'auto_fix' | 'retake';

export interface ComplianceIssue {
  code: string;
  severity: Severity;
  message: string;
  userAction: string;
}

// Maps every issue code Gemini may return to one short, concrete remediation
// the user can act on without thinking. Order: most likely → least likely.
export const ISSUE_REMEDIATIONS: Record<string, string> = {
  BG_NOT_WHITE: 'Stand in front of a plain white or light wall.',
  BG_NOT_UNIFORM: 'Move so nothing patterned shows behind your head.',
  SHADOW_ON_FACE: 'Face a window or even light; avoid overhead-only lamps.',
  SHADOW_ON_BG: 'Step a foot or two away from the wall behind you.',
  HEAD_TOO_SMALL: 'Move closer to the camera until your head fills the frame.',
  HEAD_TOO_LARGE: 'Step back from the camera so your shoulders are visible.',
  HEAD_NOT_CENTERED: 'Center your head between the left and right edges.',
  HEAD_TILTED: 'Hold your head level — both ears at the same height.',
  EYES_CLOSED: 'Open both eyes fully and look at the lens.',
  EYES_NOT_VISIBLE: 'Push your hair away from your eyes.',
  GLASSES: 'Take off your glasses and retake the photo.',
  HAT: 'Remove any hat, cap, or headwear that is not religious.',
  EXPRESSION_NOT_NEUTRAL: 'Relax your face — neutral expression, mouth closed.',
  BLURRY: 'Hold the camera steady or use a timer to avoid shake.',
  OVEREXPOSED: 'Reduce light or move away from a window behind you.',
  UNDEREXPOSED: 'Move toward a brighter, evenly lit spot.',
  RED_EYE: 'Avoid direct flash; turn on red-eye reduction or use side light.',
  MULTIPLE_FACES: 'Make sure only your own face is in the frame.',
  NO_FACE: 'Frame your face squarely in the photo, looking at the camera.',
  LOW_RESOLUTION: 'Use a higher-resolution camera or move closer.',
  CHECK_UNAVAILABLE: 'Continue at your own risk — the auto check could not run.',
};

const DEFAULT_REMEDIATION = 'Retake the photo with better lighting and a plain background.';

export function remediationFor(code: string): string {
  return ISSUE_REMEDIATIONS[code] ?? DEFAULT_REMEDIATION;
}

export interface ComplianceMetrics {
  headHeightRatio: number;       // head crown→chin as fraction of frame height
  eyeLineRatio: number;          // eye line distance from top, fraction of frame
  faceCenterX: number;           // 0..1, ideal ~0.5
  backgroundUniform: boolean;
  expressionNeutral: boolean;
  eyesOpen: boolean;
  headStraight: boolean;
  lighting: 'even' | 'uneven';
}

export interface ComplianceResult {
  country: Country;
  severity: Severity;
  summary: string;
  issues: ComplianceIssue[];
  metrics: ComplianceMetrics;
  suggestedAction: SuggestedAction;
}

const COUNTRY_RULES: Record<Country, string> = {
  US: `US passport (Dept. of State): 2x2 inches, head 1-1 3/8 inches (50-69% of frame height), eyes 1 1/8-1 3/8 inches from bottom, plain white/off-white background, no shadows on face or background, neutral expression, mouth closed, both eyes open and visible, no glasses, no hat, recent (within 6 months), color, face front-on, even lighting.`,
  EU: `EU/Schengen biometric: 35x45mm, head height 32-36mm (70-80% of frame), eyes 1/3 from top, light gray or off-white plain background, neutral expression mouth closed, both ears ideally visible, no glasses (since 2021), no hat, no shadows, sharp focus, even lighting, face straight to camera.`,
  CN: `China passport: 33x48mm, head 28-33mm (about 55-70% of frame), eyes roughly upper-third, pure white background, neutral expression, ears visible, no glasses, no hat, no jewelry that obscures features, even lighting, no shadows.`,
};

// User-facing checklist version of the rules — short bullets the user can eyeball
// against their photo when the auto-check is unavailable.
export const COUNTRY_CHECKLIST: Record<Country, string[]> = {
  US: [
    '2x2 inch square (51x51 mm)',
    'Head is 50-69% of frame height',
    'Plain white or off-white background',
    'Neutral expression, mouth closed',
    'Both eyes open and visible',
    'No glasses, no hat',
    'Even lighting, no shadows on face or background',
    'Taken within the last 6 months',
  ],
  EU: [
    '35x45 mm portrait',
    'Head is 70-80% of frame height',
    'Light gray or off-white plain background',
    'Neutral expression, mouth closed',
    'Both ears ideally visible',
    'No glasses (since 2021), no hat',
    'Sharp focus, even lighting',
    'Face straight to camera',
  ],
  CN: [
    '33x48 mm portrait',
    'Head is 55-70% of frame height',
    'Pure white background',
    'Neutral expression',
    'Ears visible',
    'No glasses, no hat, no jewelry that obscures features',
    'Even lighting, no shadows',
  ],
};

function buildPrompt(country: Country): string {
  return `You are a passport-photo compliance examiner. Evaluate the supplied photo against the following rules and return ONLY valid JSON, no markdown, no commentary.

RULES (${country}):
${COUNTRY_RULES[country]}

Output schema (return exactly this shape):
{
  "country": "${country}",
  "severity": "pass" | "warn" | "fail",
  "summary": "one short sentence",
  "issues": [{"code":"BG_NOT_WHITE","severity":"warn","message":"..."}],
  "metrics": {
    "headHeightRatio": 0.0-1.0,
    "eyeLineRatio": 0.0-1.0,
    "faceCenterX": 0.0-1.0,
    "backgroundUniform": true/false,
    "expressionNeutral": true/false,
    "eyesOpen": true/false,
    "headStraight": true/false,
    "lighting": "even" | "uneven"
  },
  "suggestedAction": "use_as_is" | "auto_fix" | "retake"
}

Issue codes to use when relevant: BG_NOT_WHITE, BG_NOT_UNIFORM, SHADOW_ON_FACE, SHADOW_ON_BG, HEAD_TOO_SMALL, HEAD_TOO_LARGE, HEAD_NOT_CENTERED, HEAD_TILTED, EYES_CLOSED, EYES_NOT_VISIBLE, GLASSES, HAT, EXPRESSION_NOT_NEUTRAL, BLURRY, OVEREXPOSED, UNDEREXPOSED, RED_EYE, MULTIPLE_FACES, NO_FACE, LOW_RESOLUTION.

Decision rules:
- severity "fail" if ANY of: NO_FACE, MULTIPLE_FACES, EYES_CLOSED, EYES_NOT_VISIBLE, GLASSES, HAT, BLURRY, HEAD_TOO_SMALL, HEAD_TOO_LARGE, head clearly tilted >15deg.
- severity "warn" if only background/lighting/centering issues present and the face is fine.
- severity "pass" if no significant issues.
- suggestedAction "auto_fix" only when fixable by AI (background, lighting, crop, head centering). "retake" when face problems (eyes closed, glasses, hat, blur). "use_as_is" on pass.

Return ONLY the JSON object.`;
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function fallbackResult(country: Country, message: string): ComplianceResult {
  return {
    country,
    severity: 'warn',
    summary: message,
    issues: [{
      code: 'CHECK_UNAVAILABLE',
      severity: 'warn',
      message,
      userAction: remediationFor('CHECK_UNAVAILABLE'),
    }],
    metrics: {
      headHeightRatio: 0,
      eyeLineRatio: 0,
      faceCenterX: 0.5,
      backgroundUniform: false,
      expressionNeutral: true,
      eyesOpen: true,
      headStraight: true,
      lighting: 'even',
    },
    suggestedAction: 'use_as_is',
  };
}

export async function checkCompliance(
  base64Image: string,
  country: Country,
): Promise<ComplianceResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return fallbackResult(country, 'AI compliance check skipped (no API key).');
  }

  const raw = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(country) },
            { inline_data: { mime_type: 'image/jpeg', data: raw } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    // Surface a clean, user-facing reason — never the raw API JSON.
    await res.text().catch(() => '');
    const friendly = classifyApiError(res.status);
    const err = new Error(friendly);
    (err as any).apiStatus = res.status;
    throw err;
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Compliance API returned no text');

  let parsed: ComplianceResult;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch (e: any) {
    throw new Error(`Compliance JSON parse failed: ${e.message}`);
  }

  return normalize(parsed, country);
}

// Defensive normalization — Gemini can drift on enum casing or omit fields.
function normalize(r: any, country: Country): ComplianceResult {
  const sev: Severity =
    r?.severity === 'pass' || r?.severity === 'warn' || r?.severity === 'fail'
      ? r.severity
      : 'warn';
  const action: SuggestedAction =
    r?.suggestedAction === 'use_as_is' ||
    r?.suggestedAction === 'auto_fix' ||
    r?.suggestedAction === 'retake'
      ? r.suggestedAction
      : sev === 'pass'
        ? 'use_as_is'
        : sev === 'fail'
          ? 'retake'
          : 'auto_fix';

  const m = r?.metrics ?? {};
  return {
    country,
    severity: sev,
    summary: typeof r?.summary === 'string' ? r.summary : '',
    issues: Array.isArray(r?.issues)
      ? r.issues.map((i: any) => {
          const code = String(i?.code ?? 'UNKNOWN');
          return {
            code,
            severity: (i?.severity === 'fail' || i?.severity === 'warn' || i?.severity === 'pass'
              ? i.severity
              : 'warn') as Severity,
            message: String(i?.message ?? ''),
            userAction: remediationFor(code),
          };
        })
      : [],
    metrics: {
      headHeightRatio: Number(m.headHeightRatio) || 0,
      eyeLineRatio: Number(m.eyeLineRatio) || 0,
      faceCenterX: Number(m.faceCenterX) || 0.5,
      backgroundUniform: Boolean(m.backgroundUniform),
      expressionNeutral: m.expressionNeutral !== false,
      eyesOpen: m.eyesOpen !== false,
      headStraight: m.headStraight !== false,
      lighting: m.lighting === 'uneven' ? 'uneven' : 'even',
    },
    suggestedAction: action,
  };
}

// Maps HTTP status from the Gemini endpoint to a one-sentence reason the user
// can act on. Keeps internal API noise out of the UI.
export function classifyApiError(status: number): string {
  if (status === 429) return 'AI compliance service is busy. Try again in a moment.';
  if (status === 401 || status === 403) return 'AI service authentication failed. Contact support.';
  if (status >= 500) return 'AI service is temporarily unavailable. Try again shortly.';
  if (status === 404) return 'AI model not found. Update the app and try again.';
  if (status >= 400) return 'Could not run the AI check. Try again later.';
  return 'AI check failed.';
}

export function countryForTemplate(templateId: string): Country {
  if (templateId.startsWith('us-')) return 'US';
  if (templateId.startsWith('eu-')) return 'EU';
  if (templateId.startsWith('china-')) return 'CN';
  return 'US';
}
