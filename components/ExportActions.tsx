import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  onPrint: () => void;
  onSavePDF: () => void;
  onExportJPG: () => void;
  onExportPNG: () => void;
  loading: boolean;
}

export default function ExportActions({
  onPrint,
  onSavePDF,
  onExportJPG,
  onExportPNG,
  loading,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.accentButton]} onPress={onPrint} activeOpacity={0.8}>
        <Text style={styles.accentButtonText}>Print Now</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onSavePDF} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>Save as PDF</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={onExportJPG} activeOpacity={0.8}>
        <Text style={styles.outlineButtonText}>Save to Photos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={onExportPNG} activeOpacity={0.8}>
        <Text style={styles.outlineButtonText}>Share PNG</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.slate,
  },
  button: {
    height: 52,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentButton: {
    backgroundColor: colors.accent,
  },
  accentButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
