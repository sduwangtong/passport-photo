import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PaperSize, paperSizes } from '../data/paperSizes';
import { colors, radii } from '../theme';

interface Props {
  selected: PaperSize;
  onSelect: (size: PaperSize) => void;
}

export default function PaperSizeSelector({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {paperSizes.map((size) => (
        <TouchableOpacity
          key={size.id}
          style={[styles.chip, selected.id === size.id && styles.selectedChip]}
          onPress={() => onSelect(size)}
        >
          <Text style={[styles.chipText, selected.id === size.id && styles.selectedChipText]}>
            {size.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  selectedChipText: {
    color: colors.white,
  },
});
