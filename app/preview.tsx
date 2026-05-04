import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Platform, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { templates } from '../data/templates';
import { paperSizes } from '../data/paperSizes';
import { calculateGrid } from '../utils/tiling';
import { processPhoto } from '../utils/imageProcessor';
import { generatePrintHTML } from '../utils/printGenerator';
import { processWithAI } from '../utils/aiProcessor';
import PhotoGrid from '../components/PhotoGrid';
import ExportActions from '../components/ExportActions';
import { colors, radii } from '../theme';

export default function PreviewScreen() {
  const { photoUri, photoWidth, photoHeight, templateId, paperId } = useLocalSearchParams<{
    photoUri: string;
    photoWidth: string;
    photoHeight: string;
    templateId: string;
    paperId: string;
  }>();

  const template = templates.find((t) => t.id === templateId) || templates[0];
  const paper = paperSizes.find((p) => p.id === paperId) || paperSizes[0];
  const grid = calculateGrid(template.widthInch, template.heightInch, paper.widthInch, paper.heightInch);

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - 48;
  const gridRef = useRef<View>(null);

  const [loading, setLoading] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Local crop/resize first, then AI enhancement
  useEffect(() => {
    let cancelled = false;

    async function process() {
      // Step 1: local processing (instant)
      const localResult = await processPhoto(
        photoUri!,
        template.widthInch,
        template.heightInch,
        Number(photoWidth),
        Number(photoHeight),
      );
      if (cancelled) return;
      setBase64Image(localResult);

      // Step 2: AI enhancement
      setAiProcessing(true);
      setAiError(null);
      try {
        const aiResult = await processWithAI(
          localResult,
          template.name,
          template.widthMM,
          template.heightMM,
        );
        if (!cancelled) setBase64Image(aiResult);
      } catch (e: any) {
        if (!cancelled) setAiError(e.message || 'AI processing failed');
      } finally {
        if (!cancelled) setAiProcessing(false);
      }
    }

    process();
    return () => { cancelled = true; };
  }, [photoUri, template, photoWidth, photoHeight]);

  const retryAI = useCallback(async () => {
    if (!base64Image) return;
    setAiProcessing(true);
    setAiError(null);
    try {
      const aiResult = await processWithAI(
        base64Image,
        template.name,
        template.widthMM,
        template.heightMM,
      );
      setBase64Image(aiResult);
    } catch (e: any) {
      setAiError(e.message || 'AI processing failed');
    } finally {
      setAiProcessing(false);
    }
  }, [base64Image, template]);

  const handlePrint = useCallback(async () => {
    if (!base64Image) return;
    setLoading(true);
    try {
      const html = generatePrintHTML(base64Image, template, paper);
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
  }, [base64Image, template, paper]);

  const handleExport = useCallback(
    async (format: 'jpg' | 'png') => {
      if (!base64Image) return;
      setLoading(true);
      try {
        if (Platform.OS === 'web') {
          const { downloadImage } = await import('../utils/webExport');
          await downloadImage(base64Image, template, paper, format);
        } else {
          // Native: capture the grid view as an image
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

  const displayUri = base64Image || photoUri!;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Template info bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {template.name} -- {template.widthMM} x {template.heightMM} mm
        </Text>
      </View>

      {/* AI status */}
      {aiProcessing && (
        <View style={styles.aiStatus}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.aiStatusText}>AI is enhancing your photo...</Text>
        </View>
      )}
      {aiError && (
        <View style={styles.aiStatus}>
          <Text style={styles.aiErrorText}>AI failed: {aiError}</Text>
          <TouchableOpacity onPress={retryAI} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo count */}
      <Text style={styles.countText}>
        {grid.total} photos per sheet ({paper.name})
      </Text>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <View ref={gridRef} collapsable={false}>
          <PhotoGrid
            photoUri={displayUri}
            template={template}
            paperSize={paper}
            containerWidth={containerWidth}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <ExportActions
          onPrint={handlePrint}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  infoBar: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  aiStatusText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500',
  },
  aiErrorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  countText: {
    fontSize: 14,
    color: colors.slate,
    marginBottom: 16,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: colors.divider,
    padding: 16,
    borderRadius: radii.sm,
  },
  actions: {
    marginBottom: 16,
  },
  dimensions: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.slate,
  },
});
