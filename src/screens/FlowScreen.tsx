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

import FontSizeZoomControl from '../components/FontSizeZoomControl';
import {
  createCueDocumentFromText,
  getVisibleCueBlocks,
  parseCueDocument,
} from '../lib/cueDocument';
import {
  clampFontSize,
  DEFAULT_TAG_SIZE,
  MAX_TAG_SIZE,
  MIN_TAG_SIZE,
  TAG_SIZE_STEP,
} from '../lib/fontSize';
import SongTags from '../components/SongTags';
import { theme } from '../theme';
import type { CueBlock, SetlistItem, Song } from '../types';

type FlowScreenProps = {
  setlistName: string;
  setlistDetails?: string;
  items: SetlistItem[];
  onGoToDashboard: () => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
  tagSize: number;
  onTagSizeChange: (tagSize: number, persist: boolean) => void;
};

export default function FlowScreen({
  setlistName,
  setlistDetails,
  items,
  onGoToDashboard,
  onFontSizeChange,
  tagSize,
  onTagSizeChange,
}: FlowScreenProps) {
  const [initialFontSizeBySong] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      items.flatMap((item) => item.kind === 'song' ? [[
        item.song.id,
        item.song.font_size ?? theme.typography.box_text_size,
      ]] : []),
    ),
  );
  const [initialFlowFontSize] = useState(() => {
    const initialSizes = Object.values(initialFontSizeBySong);
    return initialSizes.length
      ? Math.round(initialSizes.reduce((total, size) => total + size, 0) / initialSizes.length)
      : theme.typography.box_text_size;
  });
  const [fontSizeBySong, setFontSizeBySong] = useState(initialFontSizeBySong);
  const [flowFontSize, setFlowFontSize] = useState(initialFlowFontSize);
  const [flowZoomOpen, setFlowZoomOpen] = useState(false);
  const [openSongZoomIds, setOpenSongZoomIds] = useState<Record<string, boolean>>({});

  const songFontSize = (song: Song) =>
    fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size;
  const songs = items.flatMap((item) => item.kind === 'song' ? [item.song] : []);

  const setFlowFontSizeAndPersist = (nextFontSize: number, persist: boolean) => {
    const boundedFontSize = clampFontSize(nextFontSize);
    const updates = songs.map((song) => ({
      songId: song.id,
      fontSize: boundedFontSize,
    }));
    setFontSizeBySong((current) => ({
      ...current,
      ...Object.fromEntries(updates.map(({ songId, fontSize }) => [songId, fontSize])),
    }));
    setFlowFontSize(boundedFontSize);
    if (persist) {
      updates.forEach(({ songId, fontSize }) => onFontSizeChange(songId, fontSize));
    }
  };

  const setSongFontSizeAndPersist = (
    songId: string,
    nextFontSize: number,
    persist: boolean,
  ) => {
    const boundedFontSize = clampFontSize(nextFontSize);
    setFontSizeBySong((current) => ({ ...current, [songId]: boundedFontSize }));
    if (persist) {
      onFontSizeChange(songId, boundedFontSize);
    }
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
        <View style={styles.setlistHeading}>
          <Text numberOfLines={1} style={styles.setlistTitle}>
            {setlistName}
          </Text>
          {setlistDetails && (
            <Text numberOfLines={1} style={styles.setlistDetails}>
              {setlistDetails}
            </Text>
          )}
        </View>
        {songs.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flowZoomOpen ? 'Hide setlist zoom controls' : 'Show setlist zoom controls'}
            accessibilityState={{ expanded: flowZoomOpen }}
            onPress={() => setFlowZoomOpen((open) => !open)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={flowZoomOpen ? 'magnify-close' : 'magnify-plus-outline'}
              size={28}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
        )}
      </View>

      {songs.length > 0 && flowZoomOpen && (
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
            label="Set entire setlist"
            value={flowFontSize}
            onValueChange={setFlowFontSizeAndPersist}
          />
        </>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => {
          if (item.kind === 'break') {
            return (
              <View key={`break-${item.id}`} style={styles.break}>
                <View style={styles.breakRule} />
                <Text style={styles.breakTitle}>BREAK</Text>
                {item.duration_minutes !== undefined && (
                  <Text style={styles.breakDuration}>{item.duration_minutes} minutes</Text>
                )}
                <View style={styles.breakRule} />
              </View>
            );
          }

          const song = item.song;
          const cueDocument = song.cue_document
            ? parseCueDocument(song.cue_document)
            : createCueDocumentFromText(song.notes_raw_text);
          const cueBlocks = getVisibleCueBlocks(cueDocument);
          const songZoom = songFontSize(song) /
            theme.typography.box_text_size;
          return (
            <View key={song.id} style={styles.song}>
              <View style={styles.songTitle}>
                <Text style={styles.songTitleText}>
                  {song.title}
                </Text>
                <SongTags
                  tags={song.tags}
                  compact
                  scale={tagSize / DEFAULT_TAG_SIZE}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle zoom controls for ${song.title}`}
                  accessibilityState={{ expanded: !!openSongZoomIds[song.id] }}
                  onPress={() =>
                    setOpenSongZoomIds((current) => ({ ...current, [song.id]: !current[song.id] }))
                  }
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={openSongZoomIds[song.id] ? 'magnify-close' : 'magnify-plus-outline'}
                    size={26}
                    color={theme.colors.accent_highlight}
                  />
                </Pressable>
              </View>
              {openSongZoomIds[song.id] && (
              <FontSizeZoomControl
                label={`${song.title} text size`}
                value={songFontSize(song)}
                onValueChange={(nextFontSize, persist) =>
                  setSongFontSizeAndPersist(song.id, nextFontSize, persist)
                }
              />
              )}
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
    minHeight: 40,
    gap: 8,
    marginBottom: 6,
  },
  dashboardButton: {
    width: 66,
    minHeight: 40,
    justifyContent: 'center',
  },
  logo: {
    width: 64,
    height: 22,
  },
  setlistTitle: {
    flexShrink: 1,
    color: theme.colors.text_secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  setlistHeading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setlistDetails: {
    flexShrink: 1,
    color: theme.colors.text_secondary,
    fontSize: 11,
    textAlign: 'right',
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
  break: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  breakRule: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border_contrast,
  },
  breakTitle: {
    color: theme.colors.accent_highlight,
    fontSize: 16,
    fontWeight: theme.typography.font_weight_bold,
  },
  breakDuration: {
    color: theme.colors.text_secondary,
    fontSize: 14,
  },
  songTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border_contrast,
    paddingBottom: 6,
    marginBottom: 4,
  },
  songTitleText: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text_primary,
    fontSize: 17,
    fontWeight: '600',
  },
  cueContent: {
    gap: 6,
  },
  cueText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionText: {
    fontWeight: '600',
    paddingBottom: 1,
    marginBottom: 3,
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
