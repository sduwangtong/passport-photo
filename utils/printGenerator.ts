import { PhotoTemplate } from '../data/templates';
import { PaperSize } from '../data/paperSizes';
import { calculateGrid, GAP_INCH, MARGIN_INCH } from './tiling';

export interface PrintOptions {
  cutLines?: boolean;
}

export function generatePrintHTML(
  base64Image: string,
  template: PhotoTemplate,
  paperSize: PaperSize,
  options: PrintOptions = {},
): string {
  const grid = calculateGrid(
    template.widthInch,
    template.heightInch,
    paperSize.widthInch,
    paperSize.heightInch,
  );

  const cutLines = options.cutLines !== false;
  const photoWidthIn = template.widthInch;
  const photoHeightIn = template.heightInch;
  const gapIn = GAP_INCH;
  const marginIn = MARGIN_INCH;

  const tiles: string[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const leftIn = marginIn + c * (photoWidthIn + gapIn);
      const topIn = marginIn + r * (photoHeightIn + gapIn);
      tiles.push(
        `<div class="tile" style="left:${leftIn}in;top:${topIn}in;width:${photoWidthIn}in;height:${photoHeightIn}in;">`
          + `<img src="${base64Image}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          + `</div>`,
      );
    }
  }

  // Cut-line guides: short hairlines extending 0.1in past each photo corner.
  const guides: string[] = [];
  if (cutLines) {
    const tick = 0.1; // inch
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const x0 = marginIn + c * (photoWidthIn + gapIn);
        const y0 = marginIn + r * (photoHeightIn + gapIn);
        const x1 = x0 + photoWidthIn;
        const y1 = y0 + photoHeightIn;
        // 4 corners x (horizontal + vertical tick)
        const corners: Array<[number, number]> = [
          [x0, y0],
          [x1, y0],
          [x0, y1],
          [x1, y1],
        ];
        for (const [cx, cy] of corners) {
          guides.push(
            `<div class="guide" style="left:${cx - tick}in;top:${cy}in;width:${2 * tick}in;height:0;"></div>`,
          );
          guides.push(
            `<div class="guide" style="left:${cx}in;top:${cy - tick}in;width:0;height:${2 * tick}in;"></div>`,
          );
        }
      }
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: ${paperSize.widthInch}in ${paperSize.heightInch}in;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${paperSize.widthInch}in;
    height: ${paperSize.heightInch}in;
    background: #ffffff;
  }
  .sheet {
    position: relative;
    width: ${paperSize.widthInch}in;
    height: ${paperSize.heightInch}in;
  }
  .tile { position: absolute; }
  .guide {
    position: absolute;
    /* Darker + thicker so users can actually see where to cut. */
    border-top: 1pt solid #0A0A0A;
    border-left: 1pt solid #0A0A0A;
  }
</style>
</head>
<body>
<div class="sheet">
${tiles.join('\n')}
${guides.join('\n')}
</div>
</body>
</html>`;
}
