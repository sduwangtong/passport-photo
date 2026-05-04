import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { templates, PhotoTemplate } from '../data/templates';
import { paperSizes, PaperSize } from '../data/paperSizes';
import { calculateGrid } from '../utils/tiling';
import PaperSizeSelector from '../components/PaperSizeSelector';
import { colors, radii } from '../theme';

export default function TemplateScreen() {
  const { photoUri, photoWidth, photoHeight } = useLocalSearchParams<{
    photoUri: string;
    photoWidth: string;
    photoHeight: string;
  }>();

  const [selectedTemplate, setSelectedTemplate] = useState<PhotoTemplate>(templates[0]);
  const [selectedPaper, setSelectedPaper] = useState<PaperSize>(paperSizes[0]);

  const grid = calculateGrid(
    selectedTemplate.widthInch,
    selectedTemplate.heightInch,
    selectedPaper.widthInch,
    selectedPaper.heightInch,
  );

  const handleContinue = () => {
    router.push({
      pathname: '/preview',
      params: {
        photoUri,
        photoWidth,
        photoHeight,
        templateId: selectedTemplate.id,
        paperId: selectedPaper.id,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Paper size — above the fold */}
        <Text style={styles.sectionTitle}>PAPER SIZE</Text>
        <PaperSizeSelector selected={selectedPaper} onSelect={setSelectedPaper} />

        {/* Grid count */}
        <View style={styles.gridInfo}>
          <Text style={styles.gridCount}>{grid.total}</Text>
          <Text style={styles.gridLabel}>
            photos per {selectedPaper.name} ({grid.cols} x {grid.rows})
          </Text>
        </View>

        {/* 3 country cards */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>SELECT COUNTRY</Text>
        <View style={styles.cards}>
          {templates.map((t) => {
            const selected = selectedTemplate.id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setSelectedTemplate(t)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardName}>{t.name}</Text>
                <Text style={styles.cardDim}>
                  {t.widthMM} x {t.heightMM} mm
                  {t.widthInch === Math.round(t.widthInch) && ` (${t.widthInch} x ${t.heightInch} in)`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed continue button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.continueText}>Preview & Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  gridInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
    gap: 6,
  },
  gridCount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  gridLabel: {
    fontSize: 16,
    color: colors.slate,
  },
  cards: {
    gap: 12,
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  cardDim: {
    fontSize: 14,
    color: colors.slate,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
