import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  createCueDocumentFromText,
  getVisibleCueBlocks,
  parseCueDocument,
} from '../lib/cueDocument';
import { theme } from '../theme';
import type { CueBlock, Song } from '../types';

type FlowScreenProps = {
  setlistName: string;
  songs: Song[];
  onGoToDashboard: () => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function FlowScreen({
  setlistName,
  songs,
  onGoToDashboard,
  onFontSizeChange,
}: FlowScreenProps) {
  const [fontSizeBySong, setFontSizeBySong] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      songs.map((song) => [
        song.id,
        song.font_size ?? theme.typography.box_text_size,
      ]),
    ),
  );

  const songFontSize = (song: Song) =>
    fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size;
  const canZoomIn = songs.some((song) => songFontSize(song) < MAX_FONT_SIZE);
  const canZoomOut = songs.some((song) => songFontSize(song) > MIN_FONT_SIZE);

  const changeFontSize = (delta: number) => {
    const updates = songs.map((song) => ({
      songId: song.id,
      fontSize: Math.max(
        MIN_FONT_SIZE,
        Math.min(MAX_FONT_SIZE, songFontSize(song) + delta),
      ),
    }));
    setFontSizeBySong((current) => ({
      ...current,
      ...Object.fromEntries(updates.map(({ songId, fontSize }) => [songId, fontSize])),
    }));
    updates.forEach(({ songId, fontSize }) => onFontSizeChange(songId, fontSize));
  };

  const renderBlock = (block: CueBlock) => {
    const fontSize = block.font_size ?? theme.typography.box_text_size;
    const color = block.color ?? theme.colors.text_primary;
    if (block.type === 'table') {
      return (
        <View key={block.id} style={styles.table}>
          {block.rows.map((row, rowIndex) => (
            <View key={`${block.id}-row-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, columnIndex) => (
                <Text
                  key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                  style={[styles.tableCell, { color, fontSize }]}
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
          { color, fontSize },
        ]}
      >
        {block.text}
      </Text>
    );
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
        <Text numberOfLines={1} style={styles.setlistTitle}>
          {setlistName}
        </Text>
        <View style={styles.zoomControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            disabled={!canZoomOut}
            onPress={() => changeFontSize(-FONT_SIZE_STEP)}
            style={[styles.zoomButton, !canZoomOut && styles.disabledButton]}
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
            disabled={!canZoomIn}
            onPress={() => changeFontSize(FONT_SIZE_STEP)}
            style={[styles.zoomButton, !canZoomIn && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="magnify-plus-outline"
              size={25}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {songs.map((song, songIndex) => {
          const cueDocument = song.cue_document
            ? parseCueDocument(song.cue_document)
            : createCueDocumentFromText(song.notes_raw_text);
          const cueBlocks = getVisibleCueBlocks(cueDocument);
          const songZoom = songFontSize(song) /
            theme.typography.box_text_size;
          return (
            <View key={song.id} style={styles.song}>
              <Text style={styles.songTitle}>
                {songIndex + 1}. {song.title}
              </Text>
              <View style={styles.cueContent}>
                {cueBlocks.map((block) =>
                  renderBlock({
                    ...block,
                    font_size:
                      (block.font_size ?? theme.typography.box_text_size) * songZoom,
                  }),
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  setlistTitle: {
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
  disabledButton: {
    opacity: 0.4,
  },
  content: {
    paddingBottom: 24,
  },
  song: {
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
    marginBottom: 14,
  },
  songTitle: {
    color: theme.colors.accent_highlight,
    fontSize: 20,
    fontWeight: theme.typography.font_weight_bold,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border_contrast,
    paddingBottom: 10,
    marginBottom: 12,
  },
  cueContent: {
    gap: 6,
  },
  cueText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionText: {
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border_contrast,
    paddingBottom: 4,
    marginBottom: 8,
  },
  table: {
    width: '100%',
    marginVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    padding: 6,
  },
});
