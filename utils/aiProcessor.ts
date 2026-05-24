// Gemini 2.5 Flash Image — passport-photo generator.
//
// IMPORTANT: must hit generativelanguage.googleapis.com, not aiplatform.googleapis.com.
// Vertex AI (aiplatform.*) requires OAuth Bearer tokens; the AI Studio API key only
// works on generativelanguage.*. The response uses camelCase (inlineData/mimeType) on
// this endpoint, but we accept snake_case too in case Google flips it back.

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

function getApiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
}

function buildPrompt(templateName: string, widthMM: number, heightMM: number): string {
  const base =
    `Edit this photo into an official passport-style portrait. Replace the background with a perfectly uniform pure white (#FFFFFF, no gradient, no texture). Keep the same person's face, identity, hair, age, and skin tone exactly — do not stylize, do not smooth, do not change features. Frame the shoulders and head, head straight to camera, eyes open looking at the lens, mouth closed, neutral expression. Even soft lighting, no shadows on face or background. Remove any glasses, hats, or earphones. Output a photographic-quality color image — NOT a drawing or cartoon.`;

  if (templateName.includes('United States')) {
    return `${base} Country: United States (US Department of State). Final aspect 2x2 inches (square, ${widthMM}x${heightMM}mm). Head measured crown-to-chin should be 50-69% of frame height, centered horizontally.`;
  }
  if (templateName.includes('EU') || templateName.includes('Schengen')) {
    return `${base} Country: EU/Schengen biometric. Final aspect 35x45mm (portrait), so ${widthMM}x${heightMM}mm. Head 32-36mm tall (about 70-80% of frame height). Eyes at roughly one-third from top.`;
  }
  if (templateName.includes('China')) {
    return `${base} Country: China passport (PRC). Final aspect 33x48mm portrait, so ${widthMM}x${heightMM}mm. Head 28-33mm tall. Pure white background.`;
  }
  return `${base} Final aspect ${widthMM}x${heightMM}mm.`;
}

interface InlinePart {
  mimeType: string;
  data: string;
}

function extractInline(part: any): InlinePart | null {
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline) return null;
  const mimeType: string | undefined = inline.mimeType ?? inline.mime_type;
  const data: string | undefined = inline.data;
  if (!mimeType || !data) return null;
  return { mimeType, data };
}

export async function processWithAI(
  base64Image: string,
  templateName: string,
  widthMM: number,
  heightMM: number,
): Promise<string> {
  const raw = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const res = await fetch(`${API_URL}?key=${getApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(templateName, widthMM, heightMM) },
            // Both casings work; camelCase matches the live endpoint.
            { inlineData: { mimeType: 'image/jpeg', data: raw } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`AI generator returned ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = extractInline(p);
    if (inline) return `data:${inline.mimeType};base64,${inline.data}`;
  }
  throw new Error('AI did not return an image');
}
