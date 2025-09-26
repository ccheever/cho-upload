import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const glassStyles = getGlassStyles(colorScheme ?? 'light');
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isIOS ? glassStyles.tabBar : undefined,
        tabBarItemStyle: isIOS ? glassStyles.tabItem : undefined,
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={colorScheme === 'dark' ? 50 : 80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Image Upload',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="file-upload"
        options={{
          title: 'File Upload',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

function getGlassStyles(colorScheme: 'light' | 'dark') {
  return StyleSheet.create({
    tabBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 12,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(12,18,24,0.55)' : 'rgba(255,255,255,0.65)',
      paddingBottom: 4,
      paddingTop: 4,
      elevation: 0,
      shadowColor: 'rgba(0,0,0,0.45)',
      shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    tabItem: {
      paddingVertical: 6,
    },
  });
}
