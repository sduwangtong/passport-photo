import { calculateGrid, GAP_INCH, MARGIN_INCH } from '../utils/tiling';

// Regression baselines — these must NOT change without a deliberate UX decision.
describe('calculateGrid', () => {
  it('packs 2x2in photos on US Letter (8.5x11) with gap+margin', () => {
    const g = calculateGrid(2, 2, 8.5, 11);
    // usable 8x10.5; step=2+0.125 => floor(8.125/2.125)=3 cols, floor(10.625/2.125)=5 rows
    expect(g).toEqual({ cols: 3, rows: 5, total: 15 });
  });

  it('packs 35x45mm EU on A4', () => {
    const wIn = Math.round((35 / 25.4) * 100) / 100; // 1.38
    const hIn = Math.round((45 / 25.4) * 100) / 100; // 1.77
    const g = calculateGrid(wIn, hIn, 8.27, 11.69);
    expect(g.cols).toBeGreaterThanOrEqual(5);
    expect(g.rows).toBeGreaterThanOrEqual(5);
    expect(g.total).toBe(g.cols * g.rows);
  });

  it('packs 33x48mm China on US Letter', () => {
    const wIn = Math.round((33 / 25.4) * 100) / 100; // 1.30
    const hIn = Math.round((48 / 25.4) * 100) / 100; // 1.89
    const g = calculateGrid(wIn, hIn, 8.5, 11);
    expect(g.total).toBeGreaterThanOrEqual(20);
  });

  it('clamps to at least 1x1 when paper too small', () => {
    const g = calculateGrid(5, 5, 4, 4);
    expect(g).toEqual({ cols: 1, rows: 1, total: 1 });
  });

  it('exports stable margin and gap constants', () => {
    expect(GAP_INCH).toBe(0.125);
    expect(MARGIN_INCH).toBe(0.25);
  });
});
