import { PhotoTemplate } from '../data/templates';
import { PaperSize } from '../data/paperSizes';
import { calculateGrid, GAP_INCH, MARGIN_INCH } from './tiling';

const DPI = 300;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportToCanvas(
  base64Image: string,
  template: PhotoTemplate,
  paperSize: PaperSize,
): Promise<HTMLCanvasElement> {
  const grid = calculateGrid(
    template.widthInch,
    template.heightInch,
    paperSize.widthInch,
    paperSize.heightInch,
  );

  const canvasW = Math.round(paperSize.widthInch * DPI);
  const canvasH = Math.round(paperSize.heightInch * DPI);
  const photoW = Math.round(template.widthInch * DPI);
  const photoH = Math.round(template.heightInch * DPI);
  const gap = Math.round(GAP_INCH * DPI);
  const margin = Math.round(MARGIN_INCH * DPI);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const img = await loadImage(base64Image);

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const x = margin + c * (photoW + gap);
      const y = margin + r * (photoH + gap);
      ctx.drawImage(img, x, y, photoW, photoH);
    }
  }

  return canvas;
}

export async function downloadImage(
  base64Image: string,
  template: PhotoTemplate,
  paperSize: PaperSize,
  format: 'jpg' | 'png',
): Promise<void> {
  const canvas = await exportToCanvas(base64Image, template, paperSize);
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? 0.95 : undefined;

  const dataUrl = canvas.toDataURL(mimeType, quality);
  const link = document.createElement('a');
  link.download = `passport-photo-${template.id}-${paperSize.id}.${format}`;
  link.href = dataUrl;
  link.click();
}

export function printHTML(html: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to print.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}
