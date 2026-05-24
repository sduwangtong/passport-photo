# Passport-Photo E2E Verification Report — Live AI

**Date:** 2026-05-24
**Judge:** Claude Opus 4.7 (vision)
**Test photo:** `e2e/fixtures/test-photo.jpg` — single-face StyleGAN portrait (1024×1024, off-white background with subtle shadows; representative of a real online "candid")
**E2E framework:** Playwright on Chromium, against the production web bundle served by `http-server` on port 7331
**Gemini API key:** `<REDACTED — see .env.local>` (verified live for both `gemini-2.5-flash-lite` text+vision and `gemini-2.5-flash-image` image-gen)
**Total Gemini calls in run:** 3 (compliance check → image-gen → re-check) — all 200 OK
**Test runtime:** 18.8 s (was 5 s before fix — waiting for actual AI completion is what made the difference)

## Real bugs found and fixed this round

These prevented AI image-generation from EVER working with any API key:

1. **`utils/aiProcessor.ts` was pointing at `aiplatform.googleapis.com`** (Vertex AI). Vertex requires an OAuth Bearer token, not the AI-Studio query-param API key. Switched to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent` — the only endpoint that accepts AI-Studio keys.
2. **Response parser looked for snake_case `inline_data`/`mime_type`** but the live `generativelanguage` endpoint returns camelCase `inlineData`/`mimeType`. Added a `extractInline(part)` helper that accepts both shapes.
3. **Metro cache had stale env-var inlining.** The bundle ended up with `process.env.EXPO_PUBLIC_GEMINI_API_KEY` baked in as the previous depleted key in one module and the new key in another. Solved by wiping `node_modules/.cache` + `.expo` + `dist/` and rebuilding with `--clear`. Verified the bundle now contains exactly **one** unique key string.
4. **Playwright wait raced past AI completion.** The badge `expect(...).toBeVisible()` after `autoFix.click()` succeeded immediately because the original verdict's badge was still on screen. Replaced with an actual completion signal: `Auto-fixing photo` spinner must appear, then disappear, then the BEFORE/AFTER compare toggle must appear (which only happens when `canCompare(original, enhanced)` is true).
5. **Prompt** rewritten to enforce identity preservation (do not change face, age, skin), pure white background (#FFFFFF, no gradient), and "NOT a drawing or cartoon".

## Verification — per screen vs. requirement

| Slug | Requirement | Verified? | Notes |
|---|---|---|---|
| 01-home | Picker landing with clear CTAs, no upsell, supported-formats info | ✓ | Bold "Select Your Photo" headline, Take Photo + Choose from Library, "SUPPORTED FORMATS: JPG, PNG" footer. |
| 02-template-default | Country list + paper size + live photos-per-sheet count + Check Compliance CTA | ✓ | "15 photos per US Letter (3 x 5)" with US selected, A4 also available, all 3 regions shown. |
| 03-compliance-verdict | Real Gemini verdict against country rules, severity badge, codified issues + actionable remediations, action CTAs | ✓ | Live verdict: WARNINGS, summary "The background is not plain white and has some shadows", BG_NOT_WHITE + SHADOW_ON_BG with concrete remediations, Auto-fix with AI (blue) + Continue to Preview (black). |
| 04-after-autofix | After clicking Auto-fix, the photo has been REPLACED by an AI-generated version (visibly different from input), AFTER chip overlay shows, "View original" link visible | ✓ | The AI returned a photo with a clearly cleaner background (off-white shadows → near-uniform white), the same person's face/identity intact. AFTER chip overlay top-left. "View original" link below the photo. Re-check ran automatically and still flags some residual non-uniformity (BG_NOT_WHITE / BG_NOT_UNIFORM), which is real — the AI single-pass is imperfect. |
| 05-compare-original | BEFORE chip, original photo shown, "View AI-enhanced" link | ✓ | Original photo with visible warm/off-white background restored. BEFORE chip top-left. Link reads "View AI-enhanced". |
| 06-compare-enhanced | AFTER chip, AI-enhanced photo, "View original" link | ✓ | AI-enhanced photo with cleaner background shown again. AFTER chip top-left. Link reads "View original". |
| 07-preview | Printable sheet: 15 tiles of the AI-enhanced photo at correct passport dims, cut-line guides on, all 4 export actions visible | ✓ | 3×5 grid of the AI-enhanced photo (not the original), `+` cut-line corner ticks at every tile, "15 photos per sheet (US Letter)" count, Print Now + Save as PDF + Save to Photos + Share PNG. |
| 08-preview-no-cutlines | Same sheet with cut-line guides toggled OFF, ticks gone | ✓ | Ticks removed from on-screen preview, toggle checkbox unchecked. |
| 09-print-popup | New-tab print sheet at correct paper dims with bold cut marks, ready to print | ✓ | Photos tiled at absolute inch positions on white sheet, dark 1pt corner ticks at every tile. AI-enhanced photo (not the input) is what gets printed. |

**Result: 9/9 screens verified against requirements.**

## Network proof

`e2e/artifacts/gemini-calls.json` contains the URL + status + body excerpt for every Gemini round-trip during the run:

1. `gemini-2.5-flash-lite:generateContent` — 200 OK — initial compliance verdict (`severity: "warn"`, issues: `BG_NOT_WHITE`, `SHADOW_ON_BG`)
2. `gemini-2.5-flash-image:generateContent` — 200 OK — returned a PNG inlineData payload (the AI-generated passport-style portrait)
3. `gemini-2.5-flash-lite:generateContent` — 200 OK — re-check against the AI output

The body of call (2) contains the C2PA manifest header (`anYjMnBhAAAA...c2pa.signature`) confirming the image really was generated by Gemini Image, not echoed back.

## Acceptance gate

**Goal:** all features verified with requirement, screenshots as proof.
**Outcome:** met. Every screenshot in `e2e/artifacts/` corresponds to a requirement row above with the check applied against the live image. The AI path is exercised end-to-end with the new key, not the fallback path.

## Reproducing this run

```bash
EXPO_PUBLIC_GEMINI_API_KEY=<REDACTED — see .env.local> \
  npx expo export --platform web --output-dir dist --clear
npx playwright test
# Artifacts land in e2e/artifacts/; the steps.json + gemini-calls.json + console-errors.json
# document the run; PNGs are the proof.
```

## Artifact gallery

### 01-home
![01-home](../artifacts/01-home.png)

### 02-template-default
![02-template-default](../artifacts/02-template-default.png)

### 03-compliance-verdict — live Gemini verdict
![03-compliance-verdict](../artifacts/03-compliance-verdict.png)

### 04-after-autofix — AI-generated passport photo
![04-after-autofix](../artifacts/04-after-autofix.png)

### 05-compare-original — before AI
![05-compare-original](../artifacts/05-compare-original.png)

### 06-compare-enhanced — after AI
![06-compare-enhanced](../artifacts/06-compare-enhanced.png)

### 07-preview — tile sheet using AI photo
![07-preview](../artifacts/07-preview.png)

### 08-preview-no-cutlines
![08-preview-no-cutlines](../artifacts/08-preview-no-cutlines.png)

### 09-print-popup — printable sheet using AI photo
![09-print-popup](../artifacts/09-print-popup.png)
