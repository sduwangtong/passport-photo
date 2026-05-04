export interface PaperSize {
  id: string;
  name: string;
  widthInch: number;
  heightInch: number;
}

export const paperSizes: PaperSize[] = [
  { id: 'us-letter', name: 'US Letter', widthInch: 8.5, heightInch: 11 },
  { id: 'a4', name: 'A4', widthInch: 8.27, heightInch: 11.69 },
];
