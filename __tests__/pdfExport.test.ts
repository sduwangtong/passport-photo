import { buildPdfFilename } from '../utils/pdfExport';
import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';

describe('buildPdfFilename', () => {
  it('builds a slugged filename per template + paper + copies', () => {
    const us = templates.find((t) => t.id === 'us-passport')!;
    const letter = paperSizes.find((p) => p.id === 'us-letter')!;
    expect(buildPdfFilename(us, letter, 15)).toBe(
      'passport-united-states-us-letter-15copies.pdf',
    );
  });

  it('handles EU template with mm dim suffix', () => {
    const eu = templates.find((t) => t.id === 'eu-schengen')!;
    const a4 = paperSizes.find((p) => p.id === 'a4')!;
    expect(buildPdfFilename(eu, a4, 25)).toBe(
      'passport-eu-schengen-a4-25copies.pdf',
    );
  });

  it('handles Chinese template', () => {
    const cn = templates.find((t) => t.id === 'china-passport')!;
    const a4 = paperSizes.find((p) => p.id === 'a4')!;
    expect(buildPdfFilename(cn, a4, 20)).toBe(
      'passport-china-a4-20copies.pdf',
    );
  });

  it('survives unusual names by slugging consistently', () => {
    const tmpl = { id: 'x', name: 'Hello WORLD!! ', widthMM: 1, heightMM: 1, widthInch: 0.04, heightInch: 0.04 };
    const paper = { id: 'p', name: '11 x 17', widthInch: 11, heightInch: 17 };
    expect(buildPdfFilename(tmpl, paper, 1)).toBe('passport-hello-world-11-x-17-1copies.pdf');
  });

  it('always ends in .pdf', () => {
    for (const t of templates) {
      for (const p of paperSizes) {
        expect(buildPdfFilename(t, p, 1)).toMatch(/\.pdf$/);
      }
    }
  });
});
