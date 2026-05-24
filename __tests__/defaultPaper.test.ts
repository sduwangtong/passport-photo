import { defaultPaperForCountry } from '../utils/tiling';
import { paperSizes } from '../data/paperSizes';
import { templates } from '../data/templates';
import { countryForTemplate } from '../utils/geminiCompliance';

describe('defaultPaperForCountry', () => {
  it('returns US Letter for US', () => {
    expect(defaultPaperForCountry('US', paperSizes).id).toBe('us-letter');
  });

  it('returns A4 for EU and CN', () => {
    expect(defaultPaperForCountry('EU', paperSizes).id).toBe('a4');
    expect(defaultPaperForCountry('CN', paperSizes).id).toBe('a4');
  });

  it('falls back to first paper when preferred is missing', () => {
    const fallback = [{ id: 'b5', name: 'B5', widthInch: 7, heightInch: 10 }];
    expect(defaultPaperForCountry('US', fallback).id).toBe('b5');
  });

  it('throws if no papers are given', () => {
    expect(() => defaultPaperForCountry('US', [])).toThrow();
  });

  it('matches every shipped template to a usable paper', () => {
    for (const t of templates) {
      const country = countryForTemplate(t.id);
      const paper = defaultPaperForCountry(country, paperSizes);
      expect(paper).toBeDefined();
      expect(paper.widthInch).toBeGreaterThan(0);
    }
  });
});
