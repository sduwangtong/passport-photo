import * as React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { PhotoTemplate } from '../data/templates';
import { PaperSize } from '../data/paperSizes';
import { calculateGrid, GAP_INCH, MARGIN_INCH } from '../utils/tiling';
import { colors, radii } from '../theme';

interface Props {
  photoUri: string;
  template: PhotoTemplate;
  paperSize: PaperSize;
  containerWidth: number;
  cutLines?: boolean;
}

export default function PhotoGrid({ photoUri, template, paperSize, containerWidth, cutLines = false }: Props) {
  const grid = calculateGrid(
    template.widthInch,
    template.heightInch,
    paperSize.widthInch,
    paperSize.heightInch,
  );

  const scale = containerWidth / paperSize.widthInch;
  const paperHeight = paperSize.heightInch * scale;
  const photoW = template.widthInch * scale;
  const photoH = template.heightInch * scale;
  const gap = GAP_INCH * scale;
  const margin = MARGIN_INCH * scale;

  const photos: React.ReactNode[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      photos.push(
        <Image
          key={`p-${r}-${c}`}
          source={{ uri: photoUri }}
          style={{ width: photoW, height: photoH }}
          resizeMode="cover"
        />,
      );
    }
  }

  // Absolute-positioned cut-line corner ticks, so toggling has visible feedback.
  const ticks: React.ReactNode[] = [];
  if (cutLines) {
    const tickLen = 8;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const x0 = margin + c * (photoW + gap);
        const y0 = margin + r * (photoH + gap);
        const x1 = x0 + photoW;
        const y1 = y0 + photoH;
        for (const [cx, cy] of [
          [x0, y0],
          [x1, y0],
          [x0, y1],
          [x1, y1],
        ] as Array<[number, number]>) {
          ticks.push(
            <View
              key={`h-${r}-${c}-${cx}-${cy}`}
              style={{
                position: 'absolute',
                left: cx - tickLen,
                top: cy - 0.5,
                width: tickLen * 2,
                height: 1,
                backgroundColor: colors.primary,
              }}
            />,
            <View
              key={`v-${r}-${c}-${cx}-${cy}`}
              style={{
                position: 'absolute',
                left: cx - 0.5,
                top: cy - tickLen,
                width: 1,
                height: tickLen * 2,
                backgroundColor: colors.primary,
              }}
            />,
          );
        }
      }
    }
  }

  return (
    <View
      style={[
        styles.paper,
        {
          width: containerWidth,
          height: paperHeight,
          padding: margin,
          gap: gap,
        },
      ]}
    >
      {photos}
      {ticks}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
