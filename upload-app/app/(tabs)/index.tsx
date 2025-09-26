import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Button, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEMO_UPLOAD_URL, uploadAsset } from '@/utils/demo-upload';

type UploadState = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

export default function ImageUploadScreen() {
  const colorScheme = useColorScheme();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [status, setStatus] = useState<UploadState>('idle');
  const [message, setMessage] = useState('Select an image to begin.');

  const palette = Colors[colorScheme ?? 'light'];
  const statusColor = {
    idle: palette.icon,
    ready: palette.tint,
    uploading: palette.tint,
    success: '#2e7d32',
    error: '#b00020',
  }[status];

  const askForPermission = async () => {
    if (Platform.OS === 'web') {
      return true;
    }

    const { status: permissionStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionStatus !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to pick an image.');
      return false;
    }

    return true;
  };

  const pickImage = async () => {
    const granted = await askForPermission();

    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const [selected] = result.assets;
    setAsset(selected);
    setStatus('ready');
    setMessage(`Ready to upload ${selected.fileName ?? 'your image'}.`);
  };

  const uploadImage = async () => {
    if (!asset) {
      return;
    }

    try {
      setStatus('uploading');
      setMessage('Uploading image…');

      await uploadAsset(
        {
          uri: asset.uri,
          name: asset.fileName ?? inferFilename(asset.uri, 'jpg'),
          type: asset.mimeType ?? 'image/jpeg',
        },
        { fieldName: 'image' },
      );

      setStatus('success');
      setMessage('Upload complete! Swap DEMO_UPLOAD_URL with your API endpoint.');
    } catch (error) {
      console.error('Image upload failed', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Upload failed. Check your network connection and endpoint.',
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <ThemedView style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Upload an image
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            This example packages the selected photo into a multi-part form request pointed at{' '}
            <ThemedText type="defaultSemiBold">{DEMO_UPLOAD_URL}</ThemedText>. Replace the URL to wire
            up your backend.
          </ThemedText>

          <View style={styles.buttonStack}>
            <View style={styles.buttonWrapper}>
              <Button title="Choose image" onPress={pickImage} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                title={status === 'uploading' ? 'Uploading…' : 'Upload image'}
                onPress={uploadImage}
                disabled={!asset || status === 'uploading'}
              />
            </View>
          </View>

          {asset ? (
            <View style={styles.previewSection}>
              <Image source={{ uri: asset.uri }} style={styles.previewImage} contentFit="cover" />
              <ThemedText style={styles.assetName}>
                {asset.fileName ?? inferFilename(asset.uri, asset.mimeType?.split('/')[1] ?? 'jpg')}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.placeholder}>No image selected yet.</ThemedText>
          )}

          <ThemedText style={[styles.statusText, { color: statusColor }]}>{message}</ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function inferFilename(uri: string, fallbackExtension: string) {
  const derivedName = uri.split('/').pop();

  if (!derivedName) {
    return `upload.${fallbackExtension}`;
  }

  return derivedName.includes('.') ? derivedName : `${derivedName}.${fallbackExtension}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
  paragraph: {
    lineHeight: 20,
  },
  buttonStack: {
    marginTop: 8,
  },
  buttonWrapper: {
    marginBottom: 12,
  },
  previewSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d3d3d3',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
  },
  assetName: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  placeholder: {
    fontStyle: 'italic',
  },
  statusText: {
    marginTop: 4,
  },
});
