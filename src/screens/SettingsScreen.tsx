import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import FontSizeZoomControl from '../components/FontSizeZoomControl';
import SongTags from '../components/SongTags';
import { formatBuildTime, readBuildInfo } from '../lib/buildInfo';
import { DEFAULT_TAG_SIZE, MAX_TAG_SIZE, MIN_TAG_SIZE, TAG_SIZE_STEP } from '../lib/fontSize';
import {
  AUTO_SCROLL_SLIDER_CURVE,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
  MIN_AUTO_SCROLL_SPEED,
} from '../lib/settings';
import { BAR_SIZE_STEP, MAX_BAR_SIZE, MIN_BAR_SIZE } from '../lib/settings';
import type { AppSettings, SwipeMode } from '../lib/settings';
import { useTheme } from '../themeContext';
import type { ThemePreference } from '../themeContext';
import { PALETTE_OPTIONS } from '../theme';
import type { AppTheme } from '../theme';

type SettingsScreenProps = {
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  tagSize: number;
  onTagSizeChange: (tagSize: number, persist: boolean) => void;
  onResetSettings: () => void;
  onClearAllData: () => void;
  onResetSongSizes: () => void;
  hasData: boolean;
};

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const SWIPE_OPTIONS: Array<{ value: SwipeMode; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'firm', label: 'Firm' },
  { value: 'off', label: 'Off' },
];

function formatLastExport(lastExportAt: string | null) {
  return lastExportAt ? new Date(lastExportAt).toLocaleString() : 'Never';
}

export default function SettingsScreen({
  themePreference,
  onThemePreferenceChange,
  onExportLibrary,
  onImportLibrary,
  settings,
  onSettingChange,
  tagSize,
  onTagSizeChange,
  onResetSettings,
  onClearAllData,
  onResetSongSizes,
  hasData,
}: SettingsScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const buildInfo = readBuildInfo(Constants.expoConfig);
  const builtAtLabel = formatBuildTime(buildInfo.builtAt);

  const confirmReset = () =>
    Alert.alert('Reset settings?', 'Theme, sizes and performance options return to their defaults. Your songs and setlists are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onResetSettings },
    ]);

  const confirmResetSizes = () =>
    Alert.alert('Reset all song text sizes?', 'Every song will use the default text size. Custom sizes on songs and text blocks are removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onResetSongSizes },
    ]);

  const confirmClear = () =>
    Alert.alert(
      'Delete all data?',
      'This removes every setlist, group and song. Export a backup first if you might need them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Really delete everything?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete all', style: 'destructive', onPress: onClearAllData },
            ]),
        },
      ],
    );

  const [barSizeDraft, setBarSizeDraft] = useState<number | null>(null);

  const renderSegments = <T extends string>(
    options: Array<{ value: T; label: string }>,
    selectedValue: T,
    onSelect: (value: T) => void,
    labelSuffix: string,
    wrap = false,
  ) => (
    <View style={wrap ? styles.segmentedWrap : styles.segmented}>
      {options.map((option) => {
        const selected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} ${labelSuffix}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, wrap && styles.segmentChip, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSwitch = (
    label: string,
    hint: string,
    key:
      | 'keepAwake'
      | 'showPerformanceEditButton'
      | 'showPerformanceSettingsButton'
      | 'highContrast',
  ) => (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={settings[key]}
        onValueChange={(value) => onSettingChange(key, value)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        {renderSegments(THEME_OPTIONS, themePreference, onThemePreferenceChange, 'theme', true)}
        <Text style={styles.label}>Colour palette</Text>
        {renderSegments(
          PALETTE_OPTIONS,
          settings.palette,
          (value) => onSettingChange('palette', value),
          'palette',
          true,
        )}
        <Text style={styles.hint}>Every palette follows the Dark/Light/System choice above.</Text>
        {renderSwitch('High contrast', 'Stronger text and borders for dim or bright stages.', 'highContrast')}

        <Text style={styles.sectionTitle}>Performance</Text>
        {renderSwitch('Keep screen awake', 'Stops the screen sleeping in Performance and Flow.', 'keepAwake')}
        {renderSwitch(
          'Show edit button',
          'Shows the pencil in Performance and Flow headers.',
          'showPerformanceEditButton',
        )}
        {renderSwitch(
          'Show settings button',
          'Shows a shortcut to Settings in Performance and Flow headers.',
          'showPerformanceSettingsButton',
        )}
        <Text style={styles.label}>Swipe between songs</Text>
        {renderSegments(
          SWIPE_OPTIONS,
          settings.swipeMode,
          (value) => onSettingChange('swipeMode', value),
          'swipe',
          true,
        )}

        <Text style={styles.sectionTitle}>Defaults</Text>
        <Text style={styles.label}>Scroll & zoom bar size</Text>
        <FontSizeZoomControl
          alwaysShowLabel
          size={settings.barSize}
          label="Scroll & zoom bar size"
          value={barSizeDraft ?? settings.barSize}
          min={MIN_BAR_SIZE}
          max={MAX_BAR_SIZE}
          step={BAR_SIZE_STEP}
          decreaseIcon="minus"
          increaseIcon="plus"
          decreaseLabel="Smaller bars"
          increaseLabel="Larger bars"
          onValueChange={(value, persist) => {
            setBarSizeDraft(persist ? null : value);
            if (persist) {
              onSettingChange('barSize', value);
            }
          }}
        />
        <FontSizeZoomControl
          alwaysShowLabel
          size={settings.barSize}
          label="Default auto-scroll speed (pts/sec)"
          value={settings.autoScrollSpeed}
          min={MIN_AUTO_SCROLL_SPEED}
          max={MAX_AUTO_SCROLL_SPEED}
          step={AUTO_SCROLL_SPEED_STEP}
          curve={AUTO_SCROLL_SLIDER_CURVE}
          decreaseIcon="tortoise"
          increaseIcon="rabbit"
          decreaseLabel="Slower"
          increaseLabel="Faster"
          onValueChange={(value, persist) => {
            if (persist) {
              onSettingChange('autoScrollSpeed', value);
            }
          }}
        />
        <View style={styles.sizeRow}>
          <View style={styles.sizeControl}>
            <FontSizeZoomControl
              alwaysShowLabel
              size={settings.barSize}
              label="Default text size"
              value={settings.defaultFontSize}
              min={10}
              max={64}
              onValueChange={(value, persist) => {
                if (persist) {
                  onSettingChange('defaultFontSize', value);
                }
              }}
            />
          </View>
            <View style={styles.previewBox}>
              <Text style={[styles.previewText, { fontSize: settings.defaultFontSize }]}>Aa</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset all song text sizes"
                accessibilityHint="Clears sizes set on individual songs and text blocks so every song uses the default."
                style={[styles.resetSizesButton, !hasData && styles.disabledRow]}
                disabled={!hasData}
                onPress={confirmResetSizes}
              >
                <MaterialCommunityIcons name="format-size" size={16} color={theme.colors.action_primary} />
                <Text style={styles.resetSizesText}>Reset all</Text>
              </Pressable>
            </View>
        </View>
        <View style={styles.sizeRow}>
          <View style={styles.sizeControl}>
            <FontSizeZoomControl
              alwaysShowLabel
              size={settings.barSize}
              label="Tag size"
              value={tagSize}
              min={MIN_TAG_SIZE}
              max={MAX_TAG_SIZE}
              step={TAG_SIZE_STEP}
              onValueChange={onTagSizeChange}
            />
          </View>
          <View style={styles.tagSample}>
            <SongTags
              tags={[{ label: 'Aa', color: '#FFB74D' }]}
              compact
              scale={tagSize / DEFAULT_TAG_SIZE}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Library</Text>
        <Text style={styles.hint}>Last exported: {formatLastExport(settings.lastExportAt)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export"
          style={styles.row}
          onPress={onExportLibrary}
        >
          <MaterialCommunityIcons name="database-export" size={26} color={theme.colors.action_primary} />
          <Text style={styles.rowText}>Export</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import"
          style={styles.row}
          onPress={onImportLibrary}
        >
          <MaterialCommunityIcons name="database-import" size={26} color={theme.colors.action_edit} />
          <Text style={styles.rowText}>Import</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Data</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset settings"
          style={styles.row}
          onPress={confirmReset}
        >
          <MaterialCommunityIcons name="backup-restore" size={26} color={theme.colors.accent_highlight} />
          <Text style={styles.rowText}>Reset settings to defaults</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete all data"
          accessibilityState={{ disabled: !hasData }}
          disabled={!hasData}
          style={[styles.row, !hasData && styles.disabledRow]}
          onPress={confirmClear}
        >
          <MaterialCommunityIcons name="delete-forever-outline" size={26} color={theme.colors.action_danger} />
          <Text style={[styles.rowText, { color: theme.colors.action_danger }]}>Delete all setlists and songs</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.hint}>
          Dots version {buildInfo.version}
          {buildInfo.commit ? ` (${buildInfo.commit})` : ''}
        </Text>
        <Text style={styles.hint}>
          {builtAtLabel ? `Built ${builtAtLabel}` : 'Development build (not published)'}
        </Text>
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
    label: {
      color: theme.colors.text_secondary,
      fontSize: 13,
      fontWeight: '600',
    },
    hint: {
      color: theme.colors.text_secondary,
      fontSize: 13,
    },
    segmented: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 12,
      overflow: 'hidden',
    },
    segmentedWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    segmentChip: {
      flexGrow: 1,
      flexBasis: '22%',
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 10,
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
      color: theme.colors.on_accent,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    sizeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    sizeControl: {
      flex: 1,
    },
    previewBox: {
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      minWidth: 96,
      marginBottom: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 12,
      backgroundColor: theme.colors.surface_card,
    },
    previewText: {
      flexShrink: 1,
      color: theme.colors.text_primary,
    },
    tagSample: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 8,
    },
    resetSizesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.colors.border_contrast,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
    },
    resetSizesText: {
      color: theme.colors.text_secondary,
      fontSize: 11,
    },
    disabledRow: {
      opacity: 0.4,
    },
    rowText: {
      color: theme.colors.text_primary,
      fontSize: 16,
    },
  });
