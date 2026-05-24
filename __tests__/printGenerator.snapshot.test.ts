// Golden snapshots that lock the printable HTML layout for every
// (country × paper × cutLines) combination. Any deliberate layout change
// must be reviewed by updating these snapshots — accidental drift fails CI.

import { generatePrintHTML } from '../utils/printGenerator';
import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';

const PIXEL = 'data:image/jpeg;base64,AAA';

describe('print HTML golden snapshots', () => {
  for (const t of templates) {
    for (const p of paperSizes) {
      for (const cutLines of [true, false]) {
        const label = `${t.id} on ${p.id}, cutLines=${cutLines}`;
        it(label, () => {
          const html = generatePrintHTML(PIXEL, t, p, { cutLines });
          expect(html).toMatchSnapshot();
        });
      }
    }
  }
});
