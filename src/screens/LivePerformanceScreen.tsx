import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '../theme';
import type { Song } from '../types';

type LivePerformanceScreenProps = {
  songs: Song[];
  index: number;
  onIndexChange: (index: number) => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function LivePerformanceScreen({
  songs,
  index,
  onIndexChange,
  onFontSizeChange,
}: LivePerformanceScreenProps) {
  const song = songs[index];
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [fontSizeBySong, setFontSizeBySong] = useState<Record<string, number>>({});
  const fontSize =
    fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size;
  const lines = song.notes_raw_text.split(/\r?\n/);
  const availableWidth = Math.max(0, boxSize.width - theme.layout.box_padding * 2);
  const availableHeight = Math.max(0, boxSize.height - theme.layout.box_padding * 2);

  const fitsAtScale = (scale: number) => {
    const size = fontSize * scale;
    const charsPerLine = Math.max(1, availableWidth / (size * 0.55));
    const renderedLines = lines.reduce(
      (count, line) => count + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );
    return renderedLines * size * 1.25 <= availableHeight;
  };

  let lowScale = 0;
  let highScale = 1;
  if (availableWidth > 0 && availableHeight > 0 && !fitsAtScale(1)) {
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
  const displayedFontSize = Math.max(MIN_FONT_SIZE, fontSize * lowScale);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -60 && index < songs.length - 1) {
            onIndexChange(index + 1);
          } else if (gesture.dx >= 60 && index > 0) {
            onIndexChange(index - 1);
          }
        },
      }),
    [index, onIndexChange, songs.length],
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
    const nextFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize + delta));
    setFontSizeBySong((current) => ({ ...current, [song.id]: nextFontSize }));
    onFontSizeChange(song.id, nextFontSize);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.controls}>
        <Text style={styles.controlLabel}>Text size</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease cue text size"
          disabled={fontSize <= MIN_FONT_SIZE}
          onPress={() => changeFontSize(-FONT_SIZE_STEP)}
          style={[styles.sizeButton, fontSize <= MIN_FONT_SIZE && styles.disabledButton]}
        >
          <Text style={styles.sizeButtonText}>A−</Text>
        </Pressable>
        <Text style={styles.sizeValue}>{fontSize}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase cue text size"
          disabled={fontSize >= MAX_FONT_SIZE}
          onPress={() => changeFontSize(FONT_SIZE_STEP)}
          style={[styles.sizeButton, fontSize >= MAX_FONT_SIZE && styles.disabledButton]}
        >
          <Text style={styles.sizeButtonText}>A+</Text>
        </Pressable>
      </View>

      <View style={styles.boxGestureArea} {...swipeResponder.panHandlers}>
        <View
          onLayout={handleBoxLayout}
          style={[styles.box, { backgroundColor: theme.colors.surface_card }]}
        >
          <Text style={[styles.boxText, { fontSize: displayedFontSize }]}>{song.notes_raw_text}</Text>
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
  controls: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  boxGestureArea: {
    flex: 1,
  },
  controlLabel: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginRight: 4,
  },
  sizeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
  },
  sizeButtonText: {
    color: theme.colors.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  sizeValue: {
    color: theme.colors.text_primary,
    minWidth: 24,
    textAlign: 'center',
  },
  box: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    color: theme.colors.text_primary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
