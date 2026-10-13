import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { theme } from '../theme';
import type { Song } from '../types';

type LivePerformanceScreenProps = {
  song: Song;
  onFontSizeChange: (songId: string, fontSize: number) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function LivePerformanceScreen({
  song,
  onFontSizeChange,
}: LivePerformanceScreenProps) {
  const [isActive, setIsActive] = useState(false);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [fontSize, setFontSize] = useState(song.font_size ?? theme.typography.box_text_size);
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
    setFontSize(nextFontSize);
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

      <Pressable
        onLayout={handleBoxLayout}
        style={[
          styles.box,
          { backgroundColor: isActive ? theme.colors.box_active_state : theme.colors.surface_card },
          isActive && styles.boxActive,
        ]}
        onPress={() => setIsActive((current) => !current)}
      >
        <Text style={[styles.boxText, { fontSize: displayedFontSize }]}>{song.notes_raw_text}</Text>
      </Pressable>
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
  boxActive: {
    borderColor: theme.colors.accent_highlight,
  },
  boxText: {
    color: theme.colors.text_primary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
