import React, { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../themeContext';
import type { ThemePreference } from '../themeContext';
import type { AppTheme } from '../theme';

type SettingsScreenProps = {
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
};

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen({
  themePreference,
  onThemePreferenceChange,
  onExportLibrary,
  onImportLibrary,
}: SettingsScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((option) => {
            const selected = themePreference === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`${option.label} theme`}
                accessibilityState={{ selected }}
                onPress={() => onThemePreferenceChange(option.value)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Library</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export setlists as JSON"
          style={styles.row}
          onPress={onExportLibrary}
        >
          <MaterialCommunityIcons name="database-export" size={26} color="#4FC3F7" />
          <Text style={styles.rowText}>Export setlists as JSON</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import setlists from JSON"
          style={styles.row}
          onPress={onImportLibrary}
        >
          <MaterialCommunityIcons name="database-import" size={26} color="#FFB74D" />
          <Text style={styles.rowText}>Import setlists from JSON</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
      gap: 12,
    },
    sectionTitle: {
      marginTop: 8,
      color: theme.colors.text_secondary,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    segmented: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 12,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    segmentSelected: {
      backgroundColor: theme.colors.accent_highlight,
    },
    segmentText: {
      color: theme.colors.text_primary,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: theme.mode === 'light' ? '#FFFFFF' : '#000000',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    rowText: {
      color: theme.colors.text_primary,
      fontSize: 16,
    },
  });
