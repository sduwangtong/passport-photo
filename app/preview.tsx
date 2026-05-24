import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';
import { calculateGrid } from '../utils/tiling';
import { processPhoto } from '../utils/imageProcessor';
import { generatePrintHTML } from '../utils/printGenerator';
import { buildPdfFilename } from '../utils/pdfExport';
import { photoStore } from '../utils/photoStore';
import PhotoGrid from '../components/PhotoGrid';
import ExportActions from '../components/ExportActions';
import { colors, radii } from '../theme';

export default function PreviewScreen() {
  const { templateId, paperId } = useLocalSearchParams<{
    templateId: string;
    paperId: string;
  }>();

  const template = templates.find((t) => t.id === templateId) || templates[0];
  const paper = paperSizes.find((p) => p.id === paperId) || paperSizes[0];
  const grid = calculateGrid(template.widthInch, template.heightInch, paper.widthInch, paper.heightInch);

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - 48;
  const gridRef = useRef<View>(null);

  const stored = photoStore.get();
  const [loading, setLoading] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(
    stored?.enhancedBase64 ?? null,
  );
  const [withCutLines, setWithCutLines] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function ensureBase64() {
      if (base64Image) return;
      if (!stored) {
        router.replace('/');
        return;
      }
      const local = await processPhoto(
        stored.sourceUri,
        template.widthInch,
        template.heightInch,
        stored.photoWidth,
        stored.photoHeight,
      );
      if (cancelled) return;
      setBase64Image(local);
      photoStore.patch({ enhancedBase64: local });
    }
    ensureBase64();
    return () => {
      cancelled = true;
    };
  }, [base64Image, stored, template]);

  const handlePrint = useCallback(async () => {
    if (!base64Image) return;
    setLoading(true);
    try {
      const html = generatePrintHTML(base64Image, template, paper, { cutLines: withCutLines });
      if (Platform.OS === 'web') {
        const { printHTML } = await import('../utils/webExport');
        printHTML(html);
      } else {
        const Print = await import('expo-print');
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      Alert.alert('Print Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [base64Image, template, paper, withCutLines]);

  const handleSavePDF = useCallback(async () => {
    if (!base64Image) return;
    setLoading(true);
    try {
      const html = generatePrintHTML(base64Image, template, paper, { cutLines: withCutLines });
      const filename = buildPdfFilename(template, paper, grid.total);
      if (Platform.OS === 'web') {
        // No printToFile on web — just trigger the print dialog where the user can pick "Save as PDF".
        const { printHTML } = await import('../utils/webExport');
        printHTML(html);
      } else {
        const Print = await import('expo-print');
        const { uri } = await Print.printToFileAsync({ html });
        const isShareAvailable = await Sharing.isAvailableAsync();
        if (isShareAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: filename,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF Saved', `Saved to ${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert('Save PDF Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [base64Image, template, paper, withCutLines, grid.total]);

  const handleExport = useCallback(
    async (format: 'jpg' | 'png') => {
      if (!base64Image) return;
      setLoading(true);
      try {
        if (Platform.OS === 'web') {
          const { downloadImage } = await import('../utils/webExport');
          await downloadImage(base64Image, template, paper, format);
        } else {
          if (!gridRef.current) {
            Alert.alert('Error', 'Grid not ready');
            return;
          }
          const uri = await captureRef(gridRef, {
            format: format === 'jpg' ? 'jpg' : 'png',
            quality: 1,
          });
          if (format === 'jpg') {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
              await MediaLibrary.saveToLibraryAsync(uri);
              Alert.alert('Saved', 'Photo sheet saved to your library.');
            } else {
              Alert.alert('Permission Denied', 'Photo library access is required to save.');
            }
          } else {
            await Sharing.shareAsync(uri);
          }
        }
      } catch (e: any) {
        Alert.alert('Export Error', e.message);
      } finally {
        setLoading(false);
      }
    },
    [base64Image, template, paper],
  );

  const displayUri = base64Image || stored?.sourceUri || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {template.name} -- {template.widthMM} x {template.heightMM} mm
        </Text>
      </View>

      <Text style={styles.countText}>
        {grid.total} photos per sheet ({paper.name})
      </Text>

      <View style={styles.previewContainer}>
        <View ref={gridRef} collapsable={false}>
          <PhotoGrid
            photoUri={displayUri}
            template={template}
            paperSize={paper}
            containerWidth={containerWidth}
            cutLines={withCutLines}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setWithCutLines((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, withCutLines && styles.checkboxOn]}>
          {withCutLines && <View style={styles.checkmark} />}
        </View>
        <Text style={styles.toggleText}>Print cut-line guides</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <ExportActions
          onPrint={handlePrint}
          onSavePDF={handleSavePDF}
          onExportJPG={() => handleExport('jpg')}
          onExportPNG={() => handleExport('png')}
          loading={loading}
        />
      </View>

      <Text style={styles.dimensions}>
        Arrange photos for standard {paper.name} paper
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  infoBar: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  infoText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  countText: { fontSize: 14, color: colors.slate, marginBottom: 16 },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.divider,
    padding: 16,
    borderRadius: radii.sm,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkmark: { width: 10, height: 10, backgroundColor: colors.white, borderRadius: 1 },
  toggleText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  actions: { marginBottom: 16 },
  dimensions: { textAlign: 'center', fontSize: 12, color: colors.slate },
});
