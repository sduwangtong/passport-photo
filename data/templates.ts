export interface PhotoTemplate {
  id: string;
  name: string;
  widthMM: number;
  heightMM: number;
  widthInch: number;
  heightInch: number;
}

const MM_PER_INCH = 25.4;

function mmTemplate(
  id: string, name: string, widthMM: number, heightMM: number,
): PhotoTemplate {
  return {
    id, name, widthMM, heightMM,
    widthInch: Math.round((widthMM / MM_PER_INCH) * 100) / 100,
    heightInch: Math.round((heightMM / MM_PER_INCH) * 100) / 100,
  };
}

function inchTemplate(
  id: string, name: string, widthInch: number, heightInch: number,
): PhotoTemplate {
  return {
    id, name,
    widthMM: Math.round(widthInch * MM_PER_INCH),
    heightMM: Math.round(heightInch * MM_PER_INCH),
    widthInch, heightInch,
  };
}

export const templates: PhotoTemplate[] = [
  inchTemplate('us-passport', 'United States', 2, 2),
  mmTemplate('eu-schengen', 'EU / Schengen', 35, 45),
  mmTemplate('china-passport', 'China', 33, 48),
];
