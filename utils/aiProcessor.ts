// Nano Banana (Gemini 2.5 Flash Image) — same Vertex AI endpoint as Boba Diary
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const API_URL =
  'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-image:generateContent';

function buildPrompt(templateName: string, widthMM: number, heightMM: number): string {
  const base = `Generate a compliant passport photo from this selfie. Even studio lighting, no shadows. Neutral expression, centered front-facing portrait.`;

  if (templateName.includes('United States')) {
    return `${base} US passport standard: white solid background, ${widthMM}x${heightMM}mm (2x2 inches). Head height 25-35mm centered in frame.`;
  }
  if (templateName.includes('EU') || templateName.includes('Schengen')) {
    return `${base} EU/Schengen visa standard: white or light gray background, ${widthMM}x${heightMM}mm. Head height 32-36mm.`;
  }
  if (templateName.includes('China')) {
    return `${base} China passport standard: white solid background, ${widthMM}x${heightMM}mm. Head height 28-33mm.`;
  }
  return `${base} White background, ${widthMM}x${heightMM}mm.`;
}

export async function processWithAI(
  base64Image: string,
  templateName: string,
  widthMM: number,
  heightMM: number,
): Promise<string> {
  const raw = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const res = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: buildPrompt(templateName, widthMM, heightMM) },
          { inline_data: { mime_type: 'image/jpeg', data: raw } },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inline_data);
  if (!imagePart) throw new Error('AI did not return an image');

  const { mime_type, data } = imagePart.inline_data;
  return `data:${mime_type};base64,${data}`;
}
