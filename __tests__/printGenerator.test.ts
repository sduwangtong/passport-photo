import { generatePrintHTML } from '../utils/printGenerator';
import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';
import { calculateGrid } from '../utils/tiling';

const tinyB64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYE';

describe('generatePrintHTML', () => {
  it('produces an @page rule matching the paper size', () => {
    const html = generatePrintHTML(tinyB64, templates[0], paperSizes[0]);
    expect(html).toContain(`size: ${paperSizes[0].widthInch}in ${paperSizes[0].heightInch}in`);
  });

  it('emits exactly grid.total <img> tiles', () => {
    const t = templates[0];
    const p = paperSizes[0];
    const g = calculateGrid(t.widthInch, t.heightInch, p.widthInch, p.heightInch);
    const html = generatePrintHTML(tinyB64, t, p);
    const imgs = html.match(/<img /g) ?? [];
    expect(imgs.length).toBe(g.total);
  });

  it('embeds the base64 image inline', () => {
    const html = generatePrintHTML(tinyB64, templates[0], paperSizes[0]);
    expect(html).toContain(tinyB64);
  });

  it('includes cut-line guides by default and omits them when disabled', () => {
    const withGuides = generatePrintHTML(tinyB64, templates[0], paperSizes[0]);
    const withoutGuides = generatePrintHTML(tinyB64, templates[0], paperSizes[0], {
      cutLines: false,
    });
    expect(withGuides.match(/class="guide"/g)?.length ?? 0).toBeGreaterThan(0);
    expect(withoutGuides.match(/class="guide"/g)?.length ?? 0).toBe(0);
  });

  it('places each tile at an absolute inch position (deterministic layout)', () => {
    const html = generatePrintHTML(tinyB64, templates[0], paperSizes[0]);
    // First tile should start at margin 0.25in, 0.25in
    expect(html).toContain('left:0.25in;top:0.25in;');
  });
});
