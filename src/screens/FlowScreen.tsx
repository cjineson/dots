import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import FontSizeZoomControl, { barMetrics } from '../components/FontSizeZoomControl';
import {
  createCueDocumentFromText,
  flattenCueDocument,
  getVisibleCueBlocks,
  parseCueDocument,
  serializeCueDocument,
  updateCueTableCell,
  updateCueTextBlock,
} from '../lib/cueDocument';
import {
  clampFontSize,
  DEFAULT_TAG_SIZE,
  MAX_TAG_SIZE,
  MIN_TAG_SIZE,
  TAG_SIZE_STEP,
} from '../lib/fontSize';
import SongTags from '../components/SongTags';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import { useScreenAwake } from '../lib/keepAwake';
import { useUnsavedChangesPrompt } from '../lib/useUnsavedChangesPrompt';
import { parseNotes, toggleChecklistLine } from '../lib/notes';
import {
  AUTO_SCROLL_SLIDER_CURVE,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
  MIN_AUTO_SCROLL_SPEED,
} from '../lib/settings';
import type { AppSettings } from '../lib/settings';
import { resolveSongFontSize } from '../lib/fontSize';
import type { CueBlock, CueDocument, SetlistItem, Song } from '../types';

const AUTO_SCROLL_TICK_MS = 50;

type FlowScreenProps = {
  setlistId: string;
  notes?: string;
  onNotesChange: (setlistId: string, notes: string) => void;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setlistName: string;
  items: SetlistItem[];
  onGoToDashboard: () => void;
  onOpenSettings: () => void;
  onSaveCueContent: (songId: string, notesRawText: string, cueDocument: string) => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
  tagSize: number;
  onTagSizeChange: (tagSize: number, persist: boolean) => void;
};

export default function FlowScreen({
  setlistId,
  notes,
  onNotesChange,
  settings,
  onSettingChange,
  setlistName,
  items,
  onGoToDashboard,
  onOpenSettings,
  onSaveCueContent,
  onFontSizeChange,
  tagSize,
  onTagSizeChange,
}: FlowScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  useScreenAwake(settings.keepAwake);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const virtualY = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const songYs = useRef<Record<string, number>>({});
  const scrollAnchor = useRef<{ id: string; offset: number } | null>(null);
  const [scrollOpen, setScrollOpen] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(settings.autoScrollSpeed);
  const scrollSpeedRef = useRef(scrollSpeed);
  scrollSpeedRef.current = scrollSpeed;
  const noteLines = useMemo(() => (notes ? parseNotes(notes) : []), [notes]);

  useEffect(() => {
    if (!autoScrolling) {
      return undefined;
    }
    virtualY.current = scrollY.current;
    const timer = setInterval(() => {
      const maxY = Math.max(0, contentHeight.current - viewportHeight.current);
      virtualY.current = Math.min(
        maxY,
        virtualY.current + (scrollSpeedRef.current * AUTO_SCROLL_TICK_MS) / 1000,
      );
      scrollRef.current?.scrollTo({ y: virtualY.current, animated: false });
      if (virtualY.current >= maxY) {
        setAutoScrolling(false);
      }
    }, AUTO_SCROLL_TICK_MS);
    return () => clearInterval(timer);
  }, [autoScrolling]);

  const [initialFontSizeBySong] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      items.flatMap((item) => item.kind === 'song' ? [[
        item.song.id,
        resolveSongFontSize(item.song.font_size, settings.defaultFontSize),
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
  const [tagsOpen, setTagsOpen] = useState(false);
  const [openSongZoomIds, setOpenSongZoomIds] = useState<Record<string, boolean>>({});
  const [isCueEditing, setIsCueEditing] = useState(false);
  const [draftCueDocuments, setDraftCueDocuments] = useState<Record<string, CueDocument> | null>(null);
  const [cueEditBaseline, setCueEditBaseline] = useState('');
  const [savedCueDocuments, setSavedCueDocuments] = useState<Record<string, CueDocument>>({});

  const toggleTags = () => {
    setScrollOpen(false);
    setFlowZoomOpen(false);
    setOpenSongZoomIds({});
    setTagsOpen((open) => !open);
  };

  const songFontSize = (song: Song) =>
    fontSizeBySong[song.id] ?? resolveSongFontSize(song.font_size, settings.defaultFontSize);
  const songs = items.flatMap((item) => item.kind === 'song' ? [item.song] : []);
  const documents = Object.fromEntries(
    songs.map((song) => [
      song.id,
      savedCueDocuments[song.id] ?? (song.cue_document
        ? parseCueDocument(song.cue_document)
        : createCueDocumentFromText(song.notes_raw_text)),
    ]),
  ) as Record<string, CueDocument>;
  const songHasCue = (song: Song) => getVisibleCueBlocks(documents[song.id]).length > 0;
  const anySongHasCue = songs.some(songHasCue);
  const draftSnapshot = draftCueDocuments
    ? JSON.stringify(Object.fromEntries(
        Object.entries(draftCueDocuments).map(([songId, document]) => [
          songId,
          serializeCueDocument(document),
        ]),
      ))
    : '';
  const snapshot = isCueEditing && draftSnapshot !== cueEditBaseline
    ? draftSnapshot
    : 'flow-readonly';

  const saveCueEdits = () => {
    if (!draftCueDocuments) {
      return;
    }
    try {
      songs.forEach((song) => {
        const document = draftCueDocuments[song.id];
        if (serializeCueDocument(document) !== serializeCueDocument(documents[song.id])) {
          onSaveCueContent(song.id, flattenCueDocument(document), serializeCueDocument(document));
        }
      });
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
      return;
    }
    captureScrollAnchor();
    setSavedCueDocuments(draftCueDocuments);
    setIsCueEditing(false);
    setDraftCueDocuments(null);
    setCueEditBaseline('');
  };

  useUnsavedChangesPrompt({
    snapshot,
    save: saveCueEdits,
  });

  const captureScrollAnchor = () => {
    const entries = Object.entries(songYs.current)
      .filter(([, y]) => y <= scrollY.current + 1)
      .sort((a, b) => b[1] - a[1]);
    scrollAnchor.current = entries.length
      ? { id: entries[0][0], offset: scrollY.current - entries[0][1] }
      : null;
  };

  const restoreScrollAnchor = () => {
    const anchor = scrollAnchor.current;
    const y = anchor ? songYs.current[anchor.id] : undefined;
    if (anchor && y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y + anchor.offset), animated: false });
    }
  };

  useEffect(() => {
    restoreScrollAnchor();
    const timer = setTimeout(() => {
      restoreScrollAnchor();
      scrollAnchor.current = null;
    }, 400);
    return () => clearTimeout(timer);
  }, [isCueEditing]);

  const startCueEditing = () => {
    captureScrollAnchor();
    const initialDocuments = Object.fromEntries(
      songs.map((song) => [song.id, documents[song.id]]),
    );
    setDraftCueDocuments(initialDocuments);
    setCueEditBaseline(JSON.stringify(Object.fromEntries(
      Object.entries(initialDocuments).map(([songId, document]) => [
        songId,
        serializeCueDocument(document),
      ]),
    )));
    setIsCueEditing(true);
    setAutoScrolling(false);
    setScrollOpen(false);
    setTagsOpen(false);
    setFlowZoomOpen(false);
    setOpenSongZoomIds({});
  };

  const cancelCueEditing = () => {
    captureScrollAnchor();
    setIsCueEditing(false);
    setDraftCueDocuments(null);
    setCueEditBaseline('');
  };

  const updateTextCue = (songId: string, blockId: string, text: string) => {
    setDraftCueDocuments((current) => current
      ? { ...current, [songId]: updateCueTextBlock(current[songId], blockId, text) }
      : current,
    );
  };

  const updateTableCueCell = (
    songId: string,
    blockId: string,
    rowIndex: number,
    columnIndex: number,
    value: string,
  ) => {
    setDraftCueDocuments((current) => current
      ? {
          ...current,
          [songId]: updateCueTableCell(
            current[songId],
            blockId,
            rowIndex,
            columnIndex,
            value,
          ),
        }
      : current,
    );
  };

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

  const renderBlock = (block: CueBlock, songId: string) => {
    const fontSize = block.font_size ?? theme.typography.box_text_size;
    const color =
      !block.color || block.color === '#FFFFFF' ? theme.colors.text_primary : block.color;
    if (block.type === 'table') {
      return (
        <View key={block.id} style={styles.table}>
          {block.rows.map((row, rowIndex) => (
            <View key={`${block.id}-row-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, columnIndex) =>
                isCueEditing ? (
                  <TextInput
                    key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                    accessibilityLabel={`Edit table cell ${rowIndex + 1}, ${columnIndex + 1}`}
                    value={cell}
                    onChangeText={(value) =>
                      updateTableCueCell(songId, block.id, rowIndex, columnIndex, value)
                    }
                    multiline
                    textAlign="center"
                    textAlignVertical="center"
                    style={[styles.tableCell, styles.editableCueInput, { color, fontSize }]}
                  />
                ) : (
                  <Text
                    key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                    style={[styles.tableCell, { color, fontSize }]}
                  >
                    {cell}
                  </Text>
                ),
              )}
            </View>
          ))}
        </View>
      );
    }

    return isCueEditing ? (
      <TextInput
        key={block.id}
        accessibilityLabel={`Edit ${block.type} cue`}
        value={block.text}
        onChangeText={(text) => updateTextCue(songId, block.id, text)}
        multiline
        textAlign="center"
        textAlignVertical="center"
        style={[
          styles.cueText,
          block.type === 'section' && styles.sectionText,
          styles.editableCueInput,
          { color, fontSize },
        ]}
      />
    ) : (
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
          <View style={styles.flowTitleRow}>
            <Text numberOfLines={1} style={styles.setlistTitle}>
              {setlistName}
            </Text>
            {!isCueEditing && songs.length > 0 && settings.showPerformanceEditButton && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit cues"
                onPress={startCueEditing}
                hitSlop={8}
                style={styles.editCueButton}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={26}
                  color={theme.colors.accent_highlight}
                />
              </Pressable>
            )}
          </View>
          {isCueEditing ? (
            <Text style={styles.editingLabel}>Editing cues</Text>
          ) : null}
        </View>
        {isCueEditing ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel cue edits"
              onPress={cancelCueEditing}
              style={styles.editActionButton}
            >
              <Text style={styles.cancelEditText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save cue edits"
              onPress={saveCueEdits}
              style={styles.saveEditButton}
            >
              <Text style={styles.saveEditText}>Save</Text>
            </Pressable>
          </>
        ) : (
          <>
            {songs.length > 0 && (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={scrollOpen ? 'Hide auto-scroll control' : 'Show auto-scroll control'}
                  accessibilityState={{ expanded: scrollOpen }}
                  onPress={() => {
                    setTagsOpen(false);
                    setFlowZoomOpen(false);
                    setOpenSongZoomIds({});
                    setScrollOpen((open) => !open);
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={autoScrolling ? 'pause-circle-outline' : 'tortoise'}
                    size={28}
                    color={theme.colors.accent_highlight}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tagsOpen ? 'Hide tag size control' : 'Show tag size control'}
                  accessibilityState={{ expanded: tagsOpen }}
                  onPress={toggleTags}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={tagsOpen ? 'tag-off-outline' : 'tag-outline'}
                    size={28}
                    color={theme.colors.accent_highlight}
                  />
                </Pressable>
                {anySongHasCue && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={flowZoomOpen ? 'Hide setlist zoom controls' : 'Show setlist zoom controls'}
                  accessibilityState={{ expanded: flowZoomOpen }}
                  onPress={() => {
                    setTagsOpen(false);
                    setScrollOpen(false);
                    setFlowZoomOpen((open) => !open);
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={flowZoomOpen ? 'magnify-close' : 'magnify-plus-outline'}
                    size={28}
                    color={theme.colors.accent_highlight}
                  />
                </Pressable>
                )}
              </>
            )}
            {settings.showPerformanceSettingsButton && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                onPress={onOpenSettings}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={24}
                  color={theme.colors.accent_highlight}
                />
              </Pressable>
            )}
          </>
        )}
      </View>

      {!isCueEditing && songs.length > 0 && tagsOpen && (
        <FontSizeZoomControl
          size={settings.barSize}
          label="Tag size"
          value={tagSize}
          min={MIN_TAG_SIZE}
          max={MAX_TAG_SIZE}
          step={TAG_SIZE_STEP}
          onValueChange={onTagSizeChange}
        />
      )}

      {!isCueEditing && anySongHasCue && flowZoomOpen && (
        <FontSizeZoomControl
          size={settings.barSize}
          label="Set entire setlist"
          value={flowFontSize}
          onValueChange={setFlowFontSizeAndPersist}
        />
      )}

      {!isCueEditing && songs.length > 0 && scrollOpen && (
        <View style={styles.scrollPanel}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={autoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
            onPress={() => setAutoScrolling((current) => !current)}
            style={[styles.scrollPlayButton, { minWidth: barMetrics(settings.barSize).button, minHeight: barMetrics(settings.barSize).button }]}
          >
            <MaterialCommunityIcons
              name={autoScrolling ? 'pause' : 'play'}
              size={barMetrics(settings.barSize).icon}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
          <View style={styles.scrollSlider}>
            <FontSizeZoomControl
              size={settings.barSize}
              label="Auto-scroll speed (pts/sec)"
              value={scrollSpeed}
              min={MIN_AUTO_SCROLL_SPEED}
              max={MAX_AUTO_SCROLL_SPEED}
              step={AUTO_SCROLL_SPEED_STEP}
              curve={AUTO_SCROLL_SLIDER_CURVE}
              decreaseIcon="tortoise"
              increaseIcon="rabbit"
              decreaseLabel="Slower"
              increaseLabel="Faster"
              onValueChange={(next, persist) => {
                setScrollSpeed(next);
                if (persist) {
                  onSettingChange('autoScrollSpeed', next);
                }
              }}
            />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        scrollEventThrottle={32}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        onScrollBeginDrag={() => {
          scrollAnchor.current = null;
          setAutoScrolling(false);
        }}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
        }}
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
        }}
      >
        {noteLines.length > 0 && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Notes</Text>
            {noteLines.map((line, lineIndex) =>
              line.kind === 'check' ? (
                <Pressable
                  key={lineIndex}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: line.checked }}
                  onPress={() =>
                    onNotesChange(setlistId, toggleChecklistLine(notes ?? '', line.lineIndex))
                  }
                  style={styles.checkRow}
                >
                  <MaterialCommunityIcons
                    name={line.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={26}
                    color={theme.colors.accent_highlight}
                  />
                  <Text style={[styles.notesText, line.checked && styles.notesDone]}>
                    {line.text}
                  </Text>
                </Pressable>
              ) : (
                <Text key={lineIndex} style={styles.notesText}>
                  {line.text}
                </Text>
              ),
            )}
          </View>
        )}
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
          const cueDocument = isCueEditing
            ? draftCueDocuments?.[song.id] ?? documents[song.id]
            : documents[song.id];
          const cueBlocks = isCueEditing
            ? cueDocument.blocks
            : getVisibleCueBlocks(cueDocument);
          const songZoom = songFontSize(song) /
            theme.typography.box_text_size;
          return (
            <View
              key={song.id}
              style={styles.song}
              onLayout={(event) => {
                songYs.current[song.id] = event.nativeEvent.layout.y;
                if (scrollAnchor.current?.id === song.id) {
                  restoreScrollAnchor();
                }
              }}
            >
              <View style={styles.songTitle}>
                <Text style={styles.songTitleText}>
                  {song.title}
                </Text>
                <SongTags
                  tags={song.tags}
                  compact
                  scale={tagSize / DEFAULT_TAG_SIZE}
                />
                {!isCueEditing && songHasCue(song) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle zoom controls for ${song.title}`}
                    accessibilityState={{ expanded: !!openSongZoomIds[song.id] }}
                    onPress={() => {
                      setTagsOpen(false);
                      setOpenSongZoomIds((current) => ({ ...current, [song.id]: !current[song.id] }));
                    }}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={openSongZoomIds[song.id] ? 'magnify-close' : 'magnify-plus-outline'}
                      size={26}
                      color={theme.colors.accent_highlight}
                    />
                  </Pressable>
                )}
              </View>
              {!isCueEditing && songHasCue(song) && openSongZoomIds[song.id] && (
              <FontSizeZoomControl
                size={settings.barSize}
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
                  }, song.id),
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
  scrollPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollPlayButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollSlider: {
    flex: 1,
  },
  notesCard: {
    marginBottom: 16,
    padding: 12,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.surface,
  },
  notesTitle: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
  },
  notesText: {
    flexShrink: 1,
    color: theme.colors.text_primary,
    fontSize: 16,
  },
  notesDone: {
    color: theme.colors.text_secondary,
    textDecorationLine: 'line-through',
  },
  dashboardButton: {
    width: 100,
    minHeight: 44,
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 27,
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
    justifyContent: 'center',
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 4,
  },
  editCueButton: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editingLabel: {
    color: theme.colors.text_secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  editActionButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelEditText: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  saveEditButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.accent_highlight,
  },
  saveEditText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '700',
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
    alignItems: 'center',
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
  editableCueInput: {
    borderWidth: 1,
    borderColor: theme.colors.accent_highlight,
    borderRadius: 6,
    padding: 8,
    minHeight: 44,
  },
});
