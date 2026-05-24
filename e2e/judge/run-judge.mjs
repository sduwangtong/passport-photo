// LLM-as-judge for the passport-photo E2E.
// Reads every screenshot under e2e/artifacts/, sends each to Gemini with a
// rubric tied to the screen's job-to-be-done, collects structured scores,
// and writes e2e/judge/report.json + report.md.
//
// Acceptance gate: every screen's "overall" must be >= 95.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ARTIFACTS = resolve(__dirname, '..', 'artifacts');
const REPORT_JSON = join(__dirname, 'report.json');
const REPORT_MD = join(__dirname, 'report.md');

// Load EXPO_PUBLIC_GEMINI_API_KEY from .env.local if not already in env.
function loadEnv() {
  if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) return;
  const envFile = join(ROOT, '.env.local');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
loadEnv();

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing EXPO_PUBLIC_GEMINI_API_KEY — judge cannot run.');
  process.exit(1);
}

// gemini-2.5-flash is multimodal and fast. Use it for vision-based judging.
const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Per-step rubric. The judge is told what this screen MUST accomplish and how
// the top 3 competitors fail at it, so it can score relative to that bar.
const STEP_RUBRIC = {
  '01-home': {
    job: 'Photo picker landing — convey trust + clarity in <2s.',
    competitor_pain:
      'Competitor "ID Photo Maker" buries cancel in trial; "Biometric Passport Photo" has no compliance promise; "PhotoAiD" hides the actual workflow behind paywall.',
    must:
      'Two clear CTAs (Take Photo, Choose from Library), compliance + privacy promises visible, no emojis, no upsell, sharp utility aesthetic.',
  },
  '02-template-default': {
    job: 'Select country + paper size with photos-per-sheet visible.',
    competitor_pain:
      'Competitors hide tile count or require buying paper-size unlock. Biometric Passport charges $5.99 per paper size.',
    must:
      'Country list shows US/EU/CN with mm + inch dims; live photos-per-sheet count updates with paper selection; primary CTA "Check Compliance" reads as a free precondition, not paywall.',
  },
  '03-compliance-verdict': {
    job: 'Surface AI compliance verdict against the country rules with codified, actionable issues.',
    competitor_pain:
      'PhotoAiD makes user wait for human review and charges per try; Biometric does no compliance check at all; ID Photo Maker only auto-bg.',
    must:
      'Severity badge present (COMPLIANT/WARNINGS/NOT COMPLIANT), one-sentence summary, each issue has CODE + plain-language message + a concrete remediation in accent blue. Actions: optional Auto-fix, Continue, Try another.',
  },
  '04-after-autofix': {
    job: 'Demonstrate AI auto-fix produced a different/better photo than before.',
    competitor_pain:
      'PhotoAiD claims human review but no in-app proof; users have no before/after.',
    must:
      'Severity badge updated, issue list shrunk, photo visibly changed, BEFORE/AFTER chip visible or "View original" toggle present.',
  },
  '04-no-autofix-needed': {
    job: 'When photo already passes, gracefully present pass state without forcing AI cost.',
    competitor_pain: 'Competitors auto-run paid processing whether needed or not.',
    must: 'Green COMPLIANT badge, empty/short issue list, no spinner, primary "Continue to Preview" prominent.',
  },
  '05-compare-original': {
    job: 'Show the pre-AI photo so the user can compare.',
    competitor_pain: 'No competitor offers an in-app before/after.',
    must: 'Photo replaced with original; BEFORE chip overlay visible; toggle button reads "View AI-enhanced".',
  },
  '06-compare-enhanced': {
    job: 'Back to the AI-enhanced photo after comparing.',
    competitor_pain: 'See above.',
    must: 'Photo back to enhanced; AFTER chip visible; toggle button reads "View original".',
  },
  '07-preview': {
    job: 'Show the printable tile sheet with correct paper + count + actions.',
    competitor_pain:
      'Biometric charges per paper size; PhotoAiD locks PDF behind purchase; ID Photo Maker has shadow/cutting complaints.',
    must:
      'Grid of identical photos at the chosen dimensions, count text (e.g., "15 photos per sheet (US Letter)"), 4 actions (Print Now, Save as PDF, Save to Photos, Share PNG), cut-line toggle.',
  },
  '08-preview-no-cutlines': {
    job: 'Cut-line toggle works visibly; user can choose how the print looks.',
    competitor_pain: 'Competitors hide cut-line control or omit cut lines entirely.',
    must: 'Same as 07 but cut-line guides off / removed; toggle reflects unchecked state.',
  },
  '09-print-popup': {
    job: 'Print-ready HTML opens in a new tab with the actual sheet at correct paper dims.',
    competitor_pain: 'Many competitors only support emailing photos; no direct browser print.',
    must: 'Multiple identical photo tiles laid out on the paper at the documented inch positions; corners have cut-line guides; no chrome other than the sheet itself.',
  },
};

const RUBRIC_PROMPT = (slug, description) => {
  const r = STEP_RUBRIC[slug] ?? {
    job: description,
    competitor_pain: 'Generic competitor pain.',
    must: 'Useful UX, clear next action.',
  };
  return `You are a strict mobile UX judge comparing this passport-photo app against the top 3 App Store apps (ID Photo Maker, PhotoAiD, Biometric Passport Photo).

THIS SCREEN: ${slug} — ${description}

JOB TO BE DONE: ${r.job}

COMPETITOR PAIN (what we must beat): ${r.competitor_pain}

ACCEPTANCE FOR THIS SCREEN: ${r.must}

Score the attached screenshot 0–100 across:
- "visual": typography, hierarchy, contrast, no clipping, no overlap, no emojis if app forbids them
- "action": is the next user action unambiguous, button labels clear, no choice paralysis
- "compliance": for compliance/preview screens, are the country rules and tile dims accurately and credibly represented; for other screens, score 95 if not applicable
- "differentiation": does this look meaningfully better than the named competitors' equivalent screens
- "overall": holistic score — your single best estimate

Return ONLY valid JSON of this exact shape, no markdown fences:
{"visual": <int>, "action": <int>, "compliance": <int>, "differentiation": <int>, "overall": <int>, "comments": "<one short paragraph>"}

Be harsh. A score of 95+ means it credibly beats all 3 competitors on this screen. 70–90 means functional but not differentiated. <70 means broken or worse than competitors.`;
};

async function callGemini(prompt, imageBase64) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/png', data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Judge API ${res.status}: ${err.slice(0, 400)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {
    throw new Error(`Judge returned non-JSON: ${stripped.slice(0, 400)}`);
  }
}

async function main() {
  if (!existsSync(ARTIFACTS)) {
    console.error(`No artifacts directory: ${ARTIFACTS}. Run the Playwright test first.`);
    process.exit(1);
  }
  const stepsFile = join(ARTIFACTS, 'steps.json');
  if (!existsSync(stepsFile)) {
    console.error('No steps.json — did the Playwright test complete?');
    process.exit(1);
  }
  const steps = JSON.parse(readFileSync(stepsFile, 'utf8'));

  const results = [];
  for (const step of steps) {
    const filename = `${step.slug}.png`;
    const filepath = join(ARTIFACTS, filename);
    if (!existsSync(filepath)) {
      console.warn(`Missing screenshot: ${filename}`);
      continue;
    }
    const imageBase64 = readFileSync(filepath).toString('base64');
    process.stdout.write(`Judging ${step.slug}... `);
    try {
      const score = await callGemini(RUBRIC_PROMPT(step.slug, step.description), imageBase64);
      results.push({ ...step, ...score });
      console.log(`overall=${score.overall}`);
    } catch (e) {
      console.error(`failed: ${e.message}`);
      results.push({
        ...step,
        visual: 0, action: 0, compliance: 0, differentiation: 0, overall: 0,
        comments: `judge error: ${e.message}`,
      });
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.overall >= 95).length,
    minOverall: Math.min(...results.map((r) => r.overall)),
    avgOverall: Math.round(results.reduce((a, r) => a + r.overall, 0) / results.length),
    acceptanceMet: results.every((r) => r.overall >= 95),
  };

  writeFileSync(REPORT_JSON, JSON.stringify({ summary, results }, null, 2));

  const md = [
    '# Passport-Photo E2E Judge Report',
    '',
    `**Acceptance gate: every screen overall >= 95.** ${summary.acceptanceMet ? 'PASSED ✓' : 'FAILED ✗'}`,
    '',
    `- Screens judged: ${summary.total}`,
    `- Passed (>=95): ${summary.passed}/${summary.total}`,
    `- Lowest overall: ${summary.minOverall}`,
    `- Average overall: ${summary.avgOverall}`,
    '',
    '## Per-screen breakdown',
    '',
    '| Slug | Visual | Action | Compliance | Differentiation | Overall | Comments |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...results.map(
      (r) =>
        `| \`${r.slug}\` | ${r.visual} | ${r.action} | ${r.compliance} | ${r.differentiation} | **${r.overall}** | ${(r.comments ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`,
    ),
    '',
    '## Artifacts',
    '',
    ...results.map((r) => `### ${r.slug} — ${r.description}\n\n![${r.slug}](../artifacts/${r.slug}.png)\n`),
  ].join('\n');
  writeFileSync(REPORT_MD, md);

  console.log('');
  console.log(`Summary: ${summary.passed}/${summary.total} passed, avg=${summary.avgOverall}, min=${summary.minOverall}`);
  console.log(`Report: ${REPORT_MD}`);
  if (!summary.acceptanceMet) {
    console.log('Acceptance NOT met. Review the low scorers in report.md.');
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
