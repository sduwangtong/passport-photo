import { PhotoTemplate } from '../data/templates';
import { PaperSize } from '../data/paperSizes';
import { calculateGrid, GAP_INCH, MARGIN_INCH } from './tiling';

export function generatePrintHTML(
  base64Image: string,
  template: PhotoTemplate,
  paperSize: PaperSize,
): string {
  const grid = calculateGrid(
    template.widthInch,
    template.heightInch,
    paperSize.widthInch,
    paperSize.heightInch,
  );

  const photoWidthIn = template.widthInch;
  const photoHeightIn = template.heightInch;
  const gapIn = GAP_INCH;
  const marginIn = MARGIN_INCH;

  const photos = Array(grid.total)
    .fill(null)
    .map(
      () =>
        `<img src="${base64Image}" style="width:${photoWidthIn}in;height:${photoHeightIn}in;object-fit:cover;" />`,
    )
    .join('\n');

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
  body {
    width: ${paperSize.widthInch}in;
    height: ${paperSize.heightInch}in;
    padding: ${marginIn}in;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: ${gapIn}in;
  }
  img {
    display: block;
  }
</style>
</head>
<body>
${photos}
</body>
</html>`;
}
