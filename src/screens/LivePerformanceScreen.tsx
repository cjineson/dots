import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '../theme';
import SongTags from '../components/SongTags';
import PerformanceCueContent from '../components/PerformanceCueContent';
import {
  createCueDocumentFromText,
  getVisibleCueBlocks,
  parseCueDocument,
} from '../lib/cueDocument';
<<<<<<< HEAD
import {
  clampFontSize,
  DEFAULT_TAG_SIZE,
  MAX_TAG_SIZE,
  MIN_TAG_SIZE,
  TAG_SIZE_STEP,
} from '../lib/fontSize';
=======
>>>>>>> origin/main
import type { CueBlock, SetlistItem, Song } from '../types';

type LivePerformanceScreenProps = {
  items: SetlistItem[];
  index: number;
  isEditorPreview?: boolean;
  onGoToDashboard: () => void;
  onExitEditorPreview: () => void;
  onIndexChange: (index: number) => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
  tagSize: number;
  onTagSizeChange: (tagSize: number, persist: boolean) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function LivePerformanceScreen({
  items,
  index,
  isEditorPreview = false,
  onGoToDashboard,
  onExitEditorPreview,
  onIndexChange,
  onFontSizeChange,
  tagSize,
  onTagSizeChange,
}: LivePerformanceScreenProps) {
  const item = items[index];
  const song = item?.kind === 'song' ? item.song : undefined;
  const cueDocument = song?.cue_document
    ? parseCueDocument(song.cue_document)
    : createCueDocumentFromText(song?.notes_raw_text ?? '');
  const cueBlocks = getVisibleCueBlocks(cueDocument);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [fontSizeBySong, setFontSizeBySong] = useState<Record<string, number>>({});
  const [isZoomControlOpen, setIsZoomControlOpen] = useState(false);
  const [zoomTrackWidth, setZoomTrackWidth] = useState(0);
  const fontSize =
    song ? fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size
      : theme.typography.box_text_size;
  const hasManualFontSize =
    song !== undefined && (
      fontSizeBySong[song.id] !== undefined ||
      song.font_size !== undefined && song.font_size !== theme.typography.box_text_size
    );
  const availableWidth = Math.max(0, boxSize.width - theme.layout.box_padding * 2);
  const availableHeight = Math.max(0, boxSize.height - theme.layout.box_padding * 2);
<<<<<<< HEAD
  const songFontScale = fontSize / theme.typography.box_text_size;
  const [zoomOpen, setZoomOpen] = useState(false);
=======
  const songFontScale = fontSize / (song?.font_size ?? theme.typography.box_text_size);
>>>>>>> origin/main

  const baseSizeForBlock = (block: CueBlock) =>
    (block.font_size ?? theme.typography.box_text_size) * songFontScale;

  const fitsAtScale = (scale: number) => {
    const contentHeight = cueBlocks.reduce((total, block) => {
      const size = baseSizeForBlock(block) * scale;
      if (block.type === 'table') {
        const columnWidth = availableWidth / block.rows[0].length;
        const tableHeight = block.rows.reduce((height, row) => {
          const rowLines = Math.max(
            ...row.map((cell) => Math.max(1, Math.ceil(cell.length / Math.max(1, columnWidth / (size * 0.55))))),
          );
          return height + rowLines * size * 1.35;
        }, 0);
        return total + tableHeight + 8;
      }
      const renderedLines = block.text.split(/\r?\n/).reduce(
        (count, line) =>
          count + Math.max(1, Math.ceil(line.length / Math.max(1, availableWidth / (size * 0.55)))),
        0,
      );
      return total + renderedLines * size * 1.25 + (block.type === 'section' ? 12 : 4);
    }, 0);
    return contentHeight <= availableHeight;
  };

  let lowScale = 0;
  let highScale = 1;
  if (
    !hasManualFontSize &&
    availableWidth > 0 &&
    availableHeight > 0 &&
    !fitsAtScale(1)
  ) {
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const middleScale = (lowScale + highScale) / 2;
      if (fitsAtScale(middleScale)) {
        lowScale = middleScale;
      } else {
        highScale = middleScale;
      }
    }
  } else {
    lowScale = 1;
  }
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -60 && index < items.length - 1) {
            onIndexChange(index + 1);
          } else if (gesture.dx >= 60 && index > 0) {
            onIndexChange(index - 1);
          }
        },
      }),
    [index, items.length, onIndexChange],
  );

  const handleBoxLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoxSize((current) =>
      Math.abs(current.width - width) > 1 || Math.abs(current.height - height) > 1
        ? { width, height }
        : current,
    );
  };

  const changeFontSize = (delta: number) => {
    if (!song) {
      return;
    }
    const nextFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize + delta));
    setFontSizeBySong((current) => ({ ...current, [song.id]: nextFontSize }));
    onFontSizeChange(song.id, nextFontSize);
  };

  const setFontSizeFromSlider = (event: GestureResponderEvent, persist: boolean) => {
    if (!song || zoomTrackWidth <= 0) {
      return;
    }
    const progress = Math.max(0, Math.min(1, event.nativeEvent.locationX / zoomTrackWidth));
    const steps = Math.round(progress * ((MAX_FONT_SIZE - MIN_FONT_SIZE) / FONT_SIZE_STEP));
    const nextFontSize = MIN_FONT_SIZE + steps * FONT_SIZE_STEP;
    setFontSizeBySong((current) => ({ ...current, [song.id]: nextFontSize }));
    if (persist) {
      onFontSizeChange(song.id, nextFontSize);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        {isEditorPreview ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to song editor"
            onPress={onExitEditorPreview}
            style={styles.backToEditButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.accent_highlight} />
            <Text style={styles.backToEditText}>Back to edit</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Dashboard"
            onPress={onGoToDashboard}
            hitSlop={8}
            style={styles.dashboardButton}
          >
            <Image
              source={require('../../assets/branding/gigbox-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="GigBox"
            />
          </Pressable>
        )}
        <View style={styles.performanceHeading}>
          <Text numberOfLines={1} style={styles.songTitle}>
            {song?.title ?? 'Break'}
          </Text>
        </View>
        <View style={styles.performanceTags}>
          <SongTags
            tags={song?.tags}
            compact
            wrapCompact
            scale={tagSize / DEFAULT_TAG_SIZE}
          />
        </View>
        {song && !isEditorPreview && (
          <Pressable
            accessibilityRole="button"
<<<<<<< HEAD
            accessibilityLabel={zoomOpen ? 'Hide zoom controls' : 'Show zoom controls'}
            accessibilityState={{ expanded: zoomOpen }}
            onPress={() => setZoomOpen((open) => !open)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={zoomOpen ? 'magnify-close' : 'magnify-plus-outline'}
              size={30}
              color={theme.colors.accent_highlight}
            />
=======
            accessibilityLabel="Toggle text size controls"
            accessibilityState={{ expanded: isZoomControlOpen }}
            onPress={() => setIsZoomControlOpen((open) => !open)}
            style={styles.zoomToggle}
          >
            <MaterialCommunityIcons
              name="magnify-plus-outline"
              size={25}
              color={theme.colors.accent_highlight}
            />
            <MaterialCommunityIcons
              name={isZoomControlOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.text_secondary}
            />
>>>>>>> origin/main
          </Pressable>
        )}
      </View>

<<<<<<< HEAD
      {song && !isEditorPreview && zoomOpen && (
        <>
        <FontSizeZoomControl
          label="Tag size"
          value={tagSize}
          min={MIN_TAG_SIZE}
          max={MAX_TAG_SIZE}
          step={TAG_SIZE_STEP}
          onValueChange={onTagSizeChange}
        />
        <FontSizeZoomControl
          label="Song text size"
          value={fontSize}
          onValueChange={(nextFontSize, persist) => {
            const updatedFontSize = clampFontSize(nextFontSize);
            setFontSizeBySong((current) => ({
              ...current,
              [song.id]: updatedFontSize,
            }));
            if (persist) {
              onFontSizeChange(song.id, updatedFontSize);
            }
          }}
        />
        </>
=======
      {song && !isEditorPreview && isZoomControlOpen && (
        <View style={styles.zoomPanel}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease text size"
            disabled={fontSize <= MIN_FONT_SIZE}
            onPress={() => changeFontSize(-FONT_SIZE_STEP)}
            style={[styles.zoomStepButton, fontSize <= MIN_FONT_SIZE && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="magnify-minus-outline"
              size={22}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Song text size"
            accessibilityValue={{ min: MIN_FONT_SIZE, max: MAX_FONT_SIZE, now: fontSize }}
            accessibilityActions={[
              { name: 'increment', label: 'Increase text size' },
              { name: 'decrement', label: 'Decrease text size' },
            ]}
            onAccessibilityAction={(event) =>
              changeFontSize(event.nativeEvent.actionName === 'increment'
                ? FONT_SIZE_STEP
                : -FONT_SIZE_STEP)
            }
            onLayout={(event) => setZoomTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => setFontSizeFromSlider(event, false)}
            onResponderMove={(event) => setFontSizeFromSlider(event, false)}
            onResponderRelease={(event) => setFontSizeFromSlider(event, true)}
            onResponderTerminate={(event) => setFontSizeFromSlider(event, true)}
            style={styles.zoomSlider}
          >
            <View style={styles.zoomTrack}>
              <View
                style={[
                  styles.zoomTrackFill,
                  { width: `${((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.zoomThumb,
                  { left: `${((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` },
                ]}
              />
            </View>
          </View>
          <Text style={styles.zoomValue}>{fontSize}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase text size"
            disabled={fontSize >= MAX_FONT_SIZE}
            onPress={() => changeFontSize(FONT_SIZE_STEP)}
            style={[styles.zoomStepButton, fontSize >= MAX_FONT_SIZE && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="magnify-plus-outline"
              size={22}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
        </View>
>>>>>>> origin/main
      )}

      <View style={styles.boxGestureArea} {...swipeResponder.panHandlers}>
        <View onLayout={handleBoxLayout} style={[styles.box, { backgroundColor: theme.colors.surface_card }]}>
          {item?.kind === 'break' ? (
            <View style={styles.breakContent}>
              <MaterialCommunityIcons
                name="coffee"
                size={52}
                color={theme.colors.accent_highlight}
              />
              <Text style={styles.breakTitle}>BREAK</Text>
              {item.duration_minutes !== undefined && (
                <Text style={styles.breakDuration}>{item.duration_minutes} minutes</Text>
              )}
            </View>
          ) : (
          <ScrollView contentContainerStyle={styles.cueBlocks}>
            <PerformanceCueContent
              blocks={cueBlocks}
              fontScale={songFontScale * lowScale}
            />
          </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    gap: 10,
    marginBottom: 10,
  },
  dashboardButton: {
    width: 74,
    minHeight: 48,
    justifyContent: 'center',
  },
  backToEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 6,
  },
  backToEditText: {
    color: theme.colors.accent_highlight,
    fontSize: 15,
    fontWeight: '700',
  },
  logo: {
    width: 72,
    height: 24,
  },
  songTitle: {
    color: theme.colors.text_primary,
    fontSize: 18,
    fontWeight: theme.typography.font_weight_bold,
  },
  performanceHeading: {
    flex: 1,
    minWidth: 0,
  },
  performanceTags: {
    maxWidth: 220,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  breakContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  breakTitle: {
    color: theme.colors.accent_highlight,
    fontSize: 32,
    fontWeight: theme.typography.font_weight_bold,
  },
  breakDuration: {
    color: theme.colors.text_secondary,
    fontSize: 20,
  },
  zoomToggle: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    marginBottom: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  zoomStepButton: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomSlider: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  zoomTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border_contrast,
  },
  zoomTrackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent_highlight,
  },
  zoomThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.accent_highlight,
  },
  zoomValue: {
    minWidth: 22,
    color: theme.colors.text_secondary,
    textAlign: 'center',
    fontSize: 12,
  },
  boxGestureArea: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.4,
  },
  box: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
  },
  cueBlocks: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
});
