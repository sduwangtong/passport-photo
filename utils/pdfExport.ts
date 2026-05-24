// Pure helpers for the PDF export flow. The expo-print + expo-sharing side
// effects live in preview.tsx so this stays node-testable.

import type { PhotoTemplate } from '../data/templates';
import type { PaperSize } from '../data/paperSizes';

/** Produces a stable, human-readable filename for the exported PDF. */
export function buildPdfFilename(
  template: PhotoTemplate,
  paper: PaperSize,
  copies: number,
): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const t = slug(template.name) || template.id;
  const p = slug(paper.name) || paper.id;
  return `passport-${t}-${p}-${copies}copies.pdf`;
}
