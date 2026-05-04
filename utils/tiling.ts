export interface GridResult {
  cols: number;
  rows: number;
  total: number;
}

const GAP_INCH = 0.125; // 1/8 inch gap between photos
const MARGIN_INCH = 0.25; // 1/4 inch margin around edges

export function calculateGrid(
  photoWidthInch: number,
  photoHeightInch: number,
  paperWidthInch: number,
  paperHeightInch: number,
): GridResult {
  const usableWidth = paperWidthInch - 2 * MARGIN_INCH;
  const usableHeight = paperHeightInch - 2 * MARGIN_INCH;

  const cols = Math.floor((usableWidth + GAP_INCH) / (photoWidthInch + GAP_INCH));
  const rows = Math.floor((usableHeight + GAP_INCH) / (photoHeightInch + GAP_INCH));

  return {
    cols: Math.max(cols, 1),
    rows: Math.max(rows, 1),
    total: Math.max(cols, 1) * Math.max(rows, 1),
  };
}

export { GAP_INCH, MARGIN_INCH };
