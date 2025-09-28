import React from 'react';
import { Button, Platform, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, disabled }: Props) {
  if (Platform.OS !== 'web') {
    return <Button title={title} onPress={onPress} disabled={disabled} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ hovered, pressed }) => [
        styles.base,
        hovered && !disabled && styles.hover,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.12)',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    transform: [{ translateY: 0 }],
    alignSelf: 'flex-start',
    maxWidth: '100%',
    cursor: 'pointer',
    transitionDuration: '150ms',
    transitionProperty: 'transform, box-shadow, background-color',
    display: 'inline-flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  } as any,
  hover: {
    backgroundColor: '#f3f4f6',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  } as any,
  pressed: {
    transform: [{ translateY: 1 }],
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  } as any,
  disabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  } as any,
  label: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
