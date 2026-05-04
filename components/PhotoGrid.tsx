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
}

export default function PhotoGrid({ photoUri, template, paperSize, containerWidth }: Props) {
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

  const photos = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      photos.push(
        <Image
          key={`${r}-${c}`}
          source={{ uri: photoUri }}
          style={{
            width: photoW,
            height: photoH,
          }}
          resizeMode="cover"
        />,
      );
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
