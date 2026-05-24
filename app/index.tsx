import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { colors, radii } from '../theme';
import { photoStore } from '../utils/photoStore';

export default function PhotoPickerScreen() {
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    setLoading(true);
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission', 'Camera access is required to take photos.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        photoStore.set({
          sourceUri: asset.uri,
          photoWidth: asset.width,
          photoHeight: asset.height,
        });
        router.push({ pathname: '/template' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Select Your Photo</Text>
        <Text style={styles.subtitle}>
          Choose a front-facing photo with a plain background for best results.
        </Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No photo selected</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => pickImage(true)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => pickImage(false)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineButtonText}>Choose from Library</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.formats}>SUPPORTED FORMATS: JPG, PNG</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>COMPLIANCE</Text>
          <Text style={styles.infoText}>
            ISO/IEC 19794-5 standards applied automatically.
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>PRIVACY</Text>
          <Text style={styles.infoText}>
            On-device processing. No photos stored on cloud.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  hero: {
    marginTop: 32,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.slate,
    lineHeight: 22,
  },
  placeholder: {
    width: 280,
    height: 360,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.slate,
    fontWeight: '500',
  },
  buttons: {
    gap: 16,
  },
  button: {
    height: 52,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  formats: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 1.5,
    marginTop: 40,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 24,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.primary,
    lineHeight: 16,
  },
});
