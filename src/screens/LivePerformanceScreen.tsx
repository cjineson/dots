import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
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
import { createCueDocumentFromText, parseCueDocument } from '../lib/cueDocument';
import type { CueBlock, Song } from '../types';

type LivePerformanceScreenProps = {
  songs: Song[];
  index: number;
  onGoToDashboard: () => void;
  onIndexChange: (index: number) => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function LivePerformanceScreen({
  songs,
  index,
  onGoToDashboard,
  onIndexChange,
  onFontSizeChange,
}: LivePerformanceScreenProps) {
  const song = songs[index];
  const cueDocument = song.cue_document
    ? parseCueDocument(song.cue_document)
    : createCueDocumentFromText(song.notes_raw_text);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [fontSizeBySong, setFontSizeBySong] = useState<Record<string, number>>({});
  const fontSize =
    fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size;
  const availableWidth = Math.max(0, boxSize.width - theme.layout.box_padding * 2);
  const availableHeight = Math.max(0, boxSize.height - theme.layout.box_padding * 2);
  const songFontScale = fontSize / (song.font_size ?? theme.typography.box_text_size);

  const baseSizeForBlock = (block: CueBlock) =>
    (block.font_size ?? theme.typography.box_text_size) * songFontScale;

  const fitsAtScale = (scale: number) => {
    const contentHeight = cueDocument.blocks.reduce((total, block) => {
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
      <View style={styles.topBar}>
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
        <Text numberOfLines={1} style={styles.songTitle}>
          {song.title}
        </Text>
        <View style={styles.zoomControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            disabled={fontSize <= MIN_FONT_SIZE}
            onPress={() => changeFontSize(-FONT_SIZE_STEP)}
            style={[styles.zoomButton, fontSize <= MIN_FONT_SIZE && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="magnify-minus-outline"
              size={25}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            disabled={fontSize >= MAX_FONT_SIZE}
            onPress={() => changeFontSize(FONT_SIZE_STEP)}
            style={[styles.zoomButton, fontSize >= MAX_FONT_SIZE && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="magnify-plus-outline"
              size={25}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.boxGestureArea} {...swipeResponder.panHandlers}>
        <View onLayout={handleBoxLayout} style={[styles.box, { backgroundColor: theme.colors.surface_card }]}>
          <ScrollView contentContainerStyle={styles.cueBlocks}>
            {cueDocument.blocks.map((block) => {
              const blockFontSize = Math.max(MIN_FONT_SIZE, baseSizeForBlock(block) * lowScale);
              const color = block.color ?? theme.colors.text_primary;

              if (block.type === 'table') {
                return (
                  <View key={block.id} style={styles.performanceTable}>
                    {block.rows.map((row, rowIndex) => (
                      <View key={`${block.id}-row-${rowIndex}`} style={styles.performanceTableRow}>
                        {row.map((cell, columnIndex) => (
                          <Text
                            key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                            style={[
                              styles.performanceTableCell,
                              { color, fontSize: blockFontSize },
                            ]}
                          >
                            {cell}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              }

              return (
                <Text
                  key={block.id}
                  style={[
                    styles.cueText,
                    block.type === 'section' && styles.sectionText,
                    {
                      color,
                      fontSize: blockFontSize,
                      marginBottom: block.type === 'section' ? 12 : 4,
                    },
                  ]}
                >
                  {block.text}
                </Text>
              );
            })}
          </ScrollView>
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
  logo: {
    width: 72,
    height: 24,
  },
  songTitle: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 18,
    fontWeight: theme.typography.font_weight_bold,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomButton: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
  cueText: {
    color: theme.colors.text_primary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  sectionText: {
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border_contrast,
    paddingBottom: 4,
  },
  performanceTable: {
    width: '100%',
    marginVertical: 6,
  },
  performanceTableRow: {
    flexDirection: 'row',
  },
  performanceTableCell: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    padding: 6,
  },
});
