import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEMO_UPLOAD_URL, uploadAsset } from '@/utils/demo-upload';

type UploadState = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

export default function FileUploadScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [status, setStatus] = useState<UploadState>('idle');
  const [message, setMessage] = useState('Pick a document to begin.');

  const statusColor = {
    idle: palette.icon,
    ready: palette.tint,
    uploading: palette.tint,
    success: '#2e7d32',
    error: '#b00020',
  }[status];

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const [selected] = result.assets;
    setAsset(selected);
    setStatus('ready');

    const sizeLabel = typeof selected.size === 'number' ? ` (${formatBytes(selected.size)})` : '';
    setMessage(`Ready to upload ${selected.name ?? 'your file'}${sizeLabel}.`);
  };

  const uploadFile = async () => {
    if (!asset) {
      return;
    }

    try {
      setStatus('uploading');
      setMessage('Uploading file…');

      await uploadAsset(
        {
          uri: asset.uri,
          name: asset.name ?? inferFilename(asset.uri, 'bin'),
          type: asset.mimeType ?? 'application/octet-stream',
        },
        { fieldName: 'file' },
      );

      setStatus('success');
      setMessage('Upload complete! Replace DEMO_UPLOAD_URL with your API target.');
    } catch (error) {
      console.error('File upload failed', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Upload failed. Verify the endpoint and try again.',
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
            Upload a file
          </ThemedText>
          <ThemedText style={styles.paragraph}>
            Use Expo&apos;s document picker to upload any file to{' '}
            <ThemedText type="defaultSemiBold">{DEMO_UPLOAD_URL}</ThemedText>. Swap the endpoint to
            integrate your backend.
          </ThemedText>

          <View style={styles.buttonStack}>
            <View style={styles.buttonWrapper}>
              <Button title="Choose file" onPress={pickFile} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                title={status === 'uploading' ? 'Uploading…' : 'Upload file'}
                onPress={uploadFile}
                disabled={!asset || status === 'uploading'}
              />
            </View>
          </View>

          {asset ? (
            <ThemedView style={styles.fileSummary}>
              <ThemedText type="defaultSemiBold">
                {asset.name ?? inferFilename(asset.uri, asset.mimeType?.split('/')[1] ?? 'bin')}
              </ThemedText>
              <ThemedText style={styles.fileMeta}>
                {asset.mimeType ?? 'application/octet-stream'}
              </ThemedText>
              {typeof asset.size === 'number' ? (
                <ThemedText style={styles.fileMeta}>{formatBytes(asset.size)}</ThemedText>
              ) : null}
            </ThemedView>
          ) : (
            <ThemedText style={styles.placeholder}>No file selected yet.</ThemedText>
          )}

          <ThemedText style={[styles.statusText, { color: statusColor }]}>{message}</ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
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
  fileSummary: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d3d3d3',
    padding: 12,
    gap: 4,
  },
  fileMeta: {
    opacity: 0.7,
  },
  placeholder: {
    fontStyle: 'italic',
  },
  statusText: {
    marginTop: 4,
  },
});
