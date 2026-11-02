import React, { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import EmptyDashboard from '../components/EmptyDashboard';
import SongSearchPanel from '../components/SongSearchPanel';
import SongTags from '../components/SongTags';
import { useTheme } from '../themeContext';
import { TAG_COLORS } from '../lib/cueDocument';
import { hasMapTarget, openInMaps } from '../lib/maps';
import { BACKUP_REMIND_LATER_DAYS, BACKUP_REMINDER_DAYS } from '../lib/settings';
import type { SongSearchEntry } from '../lib/songSearch';
import type { AppTheme } from '../theme';
import type {
  DashboardExpansionState,
  SetlistGroup,
  SetlistItem,
  SetlistWithSongs,
  Song,
  SongTag,
  TagColor,
} from '../types';

// Picker source id for the standalone Songs list, which is not a setlist.
const STANDALONE_SOURCE = 'standalone-songs';

type DashboardScreenProps = {
  setlists: SetlistWithSongs[];
  standaloneSongs: Song[];
  groups: SetlistGroup[];
  expansionState: DashboardExpansionState;
  onExpansionStateChange: (state: DashboardExpansionState) => void;
  onCreateSetlist: (groupId?: string | null) => void;
  onOpenGroupEditor: (group?: SetlistGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenSetlistEditor: (setlist: SetlistWithSongs) => void;
  onDeleteSetlist: (setlistId: string) => void;
  onCopySetlist: (setlistId: string) => void;
  onCopySong: (songId: string, targetSetlistId: string, variantTag?: SongTag) => void;
  onDeleteSong: (setlistId: string, songId: string) => void;
  onDeleteSongPermanently: (songId: string) => void;
  onDeleteBreak: (setlistId: string, breakId: string) => void;
  onCreateBreak: (setlistId: string, durationMinutes?: number) => void;
  onOpenFlow: (setlist: SetlistWithSongs) => void;
  onOpenSongForEdit: (setlistId?: string, song?: Song) => void;
  onCreateSong: (groupId?: string | null) => void;
  onOpenPerformance: (items: SetlistItem[], index: number) => void;
  onOpenNewSong: (setlistId: string) => void;
  onReorderSetlists: (orderedIds: string[]) => void;
  onReorderItems: (setlistId: string, items: SetlistItem[]) => void;
  onReorderSongs: (orderedIds: string[]) => void;
  searchEntries: SongSearchEntry[];
  onOpenSettings: () => void;
  onImportLibrary: () => void;
  backupReminder?: boolean;
  onSnoozeBackupReminder?: (days: number) => void;
};

export default function DashboardScreen({
  setlists,
  standaloneSongs,
  groups,
  expansionState,
  onExpansionStateChange,
  onCreateSetlist,
  onOpenGroupEditor,
  onDeleteGroup,
  onOpenSetlistEditor,
  onDeleteSetlist,
  onCopySetlist,
  onCopySong,
  onDeleteSong,
  onDeleteSongPermanently,
  onDeleteBreak,
  onCreateBreak,
  onOpenFlow,
  onOpenSongForEdit,
  onCreateSong,
  onOpenPerformance,
  onOpenNewSong,
  onReorderSetlists,
  onReorderItems,
  onReorderSongs,
  searchEntries,
  onOpenSettings,
  onImportLibrary,
  backupReminder = false,
  onSnoozeBackupReminder,
}: DashboardScreenProps) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, screenWidth), [theme, screenWidth]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [highlightKey, setHighlightKey] = React.useState<string | null>(null);
  // The nestable container forwards its ref to a gesture-handler ScrollView, which wraps the native one.
  const scrollRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const contentRef = React.useRef<React.ComponentRef<typeof View>>(null);
  const targetRefs = React.useRef<Record<string, React.ComponentRef<typeof View> | null>>({});
  const highlightTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [addingBreakTo, setAddingBreakTo] = React.useState<string | null>(null);
  const [breakDuration, setBreakDuration] = React.useState('');
  const [menu, setMenu] = React.useState<{
    title: string;
    options: Array<{ label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void }>;
  } | null>(null);
  const [picker, setPicker] = React.useState<
    | { kind: 'copy-setlist' }
    | { kind: 'copy-song'; targetSetlistId: string; sourceSetlistId: string | null }
    | null
  >(null);
  const [copyingSong, setCopyingSong] = React.useState<{
    song: Song;
    sourceSetlistId?: string;
  } | null>(null);
  const [variantFor, setVariantFor] = React.useState<{
    song: Song;
    setlistId: string;
  } | null>(null);
  const [variantName, setVariantName] = React.useState('');
  const [variantColor, setVariantColor] = React.useState<TagColor>(TAG_COLORS[4]);

  const confirmDeleteGroup = (group: SetlistGroup) => {
    Alert.alert(
      'Remove group?',
      `Remove "${group.name}"? Its setlists will remain on the dashboard as ungrouped setlists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove group',
          style: 'destructive',
          onPress: () => {
            try {
              onDeleteGroup(group.id);
            } catch (error) {
              Alert.alert(
                'Could not remove group',
                error instanceof Error ? error.message : 'An unexpected error occurred.',
              );
            }
          },
        },
      ],
    );
  };

  const confirmDeleteSetlist = (setlist: SetlistWithSongs) => {
    Alert.alert(
      'Delete setlist?',
      `Delete "${setlist.name}" and its breaks? Songs used only here will stay in your Songs list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              onDeleteSetlist(setlist.id);
            } catch (error) {
              Alert.alert(
                'Delete failed',
                error instanceof Error ? error.message : 'An unexpected error occurred.',
              );
            }
          },
        },
      ],
    );
  };

  const copyEntireSetlist = (setlist: SetlistWithSongs) => {
    try {
      onCopySetlist(setlist.id);
      Alert.alert('Setlist copied', `"Copy of ${setlist.name}" was added to your library.`);
    } catch (error) {
      Alert.alert(
        'Copy failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  const openAddMenu = (setlist: SetlistWithSongs) => {
    setMenu({
      title: `Add to ${setlist.name}`,
      options: [
        { label: 'Add new song', icon: 'music-note-plus', onPress: () => onOpenNewSong(setlist.id) },
        {
          label: 'Add existing song',
          icon: 'content-copy',
          onPress: () => setPicker({ kind: 'copy-song', targetSetlistId: setlist.id, sourceSetlistId: null }),
        },
        {
          label: 'Add break',
          icon: 'coffee',
          onPress: () => {
            setBreakDuration('');
            setAddingBreakTo(setlist.id);
          },
        },
      ],
    });
  };

  const openGroupAddMenu = (group: SetlistGroup) => {
    setMenu({
      title: `Add to ${group.name}`,
      options: [
        { label: 'Add new setlist', icon: 'playlist-plus', onPress: () => onCreateSetlist(group.id) },
        { label: 'Add new song', icon: 'music-note-plus', onPress: () => onCreateSong(group.id) },
      ],
    });
  };

  const jumpToSong = (entry: SongSearchEntry) => {
    setSearchOpen(false);
    const key = entry.setlistId ? `setlist:${entry.setlistId}:${entry.song.id}` : `song:${entry.song.id}`;
    const collapsedGroups = { ...expansionState.collapsedGroups };
    if (entry.groupId) {
      delete collapsedGroups[entry.groupId];
    }
    const expandedSetlists = { ...expansionState.expandedSetlists };
    if (entry.setlistId) {
      expandedSetlists[entry.setlistId] = true;
    }
    onExpansionStateChange({ expandedSetlists, collapsedGroups });
    setHighlightKey(key);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightKey(null), 4000);
    // Give the expanded rows a moment to lay out before measuring.
    setTimeout(() => {
      const target = targetRefs.current[key];
      const content = contentRef.current;
      if (!target || !content) {
        return;
      }
      target.measureLayout(
        content,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true }),
        () => undefined,
      );
    }, 300);
  };

  React.useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const openNewSetlistMenu = () => {
    setMenu({
      title: 'Add setlist',
      options: [
        { label: 'Add new setlist', icon: 'playlist-plus', onPress: () => onCreateSetlist(null) },
        { label: 'Add new setlist from existing', icon: 'content-copy', onPress: () => setPicker({ kind: 'copy-setlist' }) },
      ],
    });
  };

  const pickerFromStandalone =
    picker?.kind === 'copy-song' && picker.sourceSetlistId === STANDALONE_SOURCE;
  const pickerSource = picker?.kind === 'copy-song'
    ? pickerFromStandalone
      ? {
          name: 'Songs',
          items: standaloneSongs.map((song): SetlistItem => ({ kind: 'song', song })),
        }
      : setlists.find((setlist) => setlist.id === picker.sourceSetlistId)
    : undefined;

  const copySongTo = (targetSetlistId: string) => {
    if (!copyingSong) {
      return;
    }
    if (copyingSong.sourceSetlistId && targetSetlistId === copyingSong.sourceSetlistId) {
      // Same-title songs in one setlist must differ by tag, so ask for one.
      setVariantFor({ song: copyingSong.song, setlistId: targetSetlistId });
      setVariantName('');
      setCopyingSong(null);
      return;
    }
    try {
      onCopySong(copyingSong.song.id, targetSetlistId);
      setCopyingSong(null);
    } catch (error) {
      Alert.alert(
        'Copy failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  const createVariant = () => {
    if (!variantFor || !variantName.trim()) {
      return;
    }
    try {
      onCopySong(variantFor.song.id, variantFor.setlistId, {
        label: variantName.trim(),
        color: variantColor,
      });
      setVariantFor(null);
    } catch (error) {
      Alert.alert(
        'Copy failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  const confirmDeleteSong = (setlistId: string, song: Song) => {
    const run = (action: () => void) => () => {
      try {
        action();
      } catch (error) {
        Alert.alert(
          'Update failed',
          error instanceof Error ? error.message : 'An unexpected error occurred.',
        );
      }
    };
    const usedElsewhere = setlists.some(
      (setlist) =>
        setlist.id !== setlistId &&
        setlist.items.some((item) => item.kind === 'song' && item.song.id === song.id),
    );
    if (usedElsewhere) {
      Alert.alert('Remove song from setlist?', `"${song.title}" stays in your other setlists.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: run(() => onDeleteSong(setlistId, song.id)),
        },
      ]);
      return;
    }

    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove permanently',
        style: 'destructive',
        onPress: run(() => onDeleteSongPermanently(song.id)),
      },
    ];
    buttons.splice(1, 0, {
      text: 'Keep in Songs',
      onPress: run(() => onDeleteSong(setlistId, song.id)),
    });
    Alert.alert(
      'This is the last setlist for this song',
      `"${song.title}" isn't in any other setlist. Keep it in your Songs list, or remove it permanently?`,
      buttons,
    );
  };

  const confirmDeleteStandaloneSong = (song: Song) => {
    Alert.alert('Remove song permanently?', `Delete "${song.title}" from your Songs list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            onDeleteSongPermanently(song.id);
          } catch (error) {
            Alert.alert(
              'Delete failed',
              error instanceof Error ? error.message : 'An unexpected error occurred.',
            );
          }
        },
      },
    ]);
  };

  const saveBreak = () => {
    if (!addingBreakTo) {
      return;
    }
    const durationMinutes = breakDuration.trim() ? Number(breakDuration) : undefined;
    if (
      durationMinutes !== undefined &&
      (!Number.isSafeInteger(durationMinutes) || durationMinutes < 1)
    ) {
      return;
    }
    try {
      onCreateBreak(addingBreakTo, durationMinutes);
      setAddingBreakTo(null);
      setBreakDuration('');
    } catch (error) {
      Alert.alert(
        'Could not add break',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  const confirmDeleteBreak = (setlistId: string, breakId: string) => {
    Alert.alert('Delete break?', 'Remove this break from the setlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            onDeleteBreak(setlistId, breakId);
          } catch (error) {
            Alert.alert(
              'Delete failed',
              error instanceof Error ? error.message : 'An unexpected error occurred.',
            );
          }
        },
      },
    ]);
  };

  const durationIsValid =
    !breakDuration.trim() ||
    Number.isSafeInteger(Number(breakDuration)) && Number(breakDuration) > 0;

  const dashboardEntries = [
    { type: 'setlists' as const, key: 'ungrouped', setlists: setlists.filter((setlist) => !setlist.group_id), indented: false },
    ...groups.flatMap((group) => [
      { type: 'group' as const, key: `group-${group.id}`, group },
      ...(!expansionState.collapsedGroups[group.id]
        ? [{
            type: 'setlists' as const,
            key: `setlists-${group.id}`,
            setlists: setlists.filter((setlist) => setlist.group_id === group.id),
            indented: true,
          }, {
            type: 'songs' as const,
            key: `songs-${group.id}`,
            songs: standaloneSongs.filter((song) => song.group_id === group.id),
          }]
        : []),
    ]),
  ];
  const topLevelSongs = standaloneSongs.filter((song) => !song.group_id);
  const hasAnySetlists = setlists.length > 0 || groups.length > 0;
  const hasAnyContent = hasAnySetlists || standaloneSongs.length > 0;

  const reorderEnabled = !setlists.some((setlist) => expansionState.expandedSetlists[setlist.id]);

  const toggleSetlist = (setlistId: string) => {
    const expandedSetlists = { ...expansionState.expandedSetlists };
    if (expandedSetlists[setlistId]) {
      delete expandedSetlists[setlistId];
    } else {
      expandedSetlists[setlistId] = true;
    }
    onExpansionStateChange({ ...expansionState, expandedSetlists });
  };

  const toggleGroup = (groupId: string) => {
    const collapsedGroups = { ...expansionState.collapsedGroups };
    if (collapsedGroups[groupId]) {
      delete collapsedGroups[groupId];
    } else {
      collapsedGroups[groupId] = true;
    }
    onExpansionStateChange({ ...expansionState, collapsedGroups });
  };

  const renderSongRow = (
    song: Song,
    siblingCount: number,
    drag: () => void,
    isActive: boolean,
  ) => {
    const key = `song:${song.id}`;
    return (
      <View
        ref={(node) => { targetRefs.current[key] = node; }}
        collapsable={false}
        style={[
          styles.songRow,
          isActive && styles.songRowDragging,
          highlightKey === key && styles.songRowHighlight,
        ]}
      >
        {reorderEnabled && siblingCount > 1 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reorder ${song.title}`}
            onLongPress={drag}
            delayLongPress={180}
            style={styles.dragHandle}
          >
            <Text style={styles.dragHandleText}>☰</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${song.title}`}
          style={styles.songHeading}
          onPress={() => onOpenPerformance([{ kind: 'song', song }], 0)}
        >
          <Text style={styles.songTitle}>{song.title}</Text>
          <SongTags tags={song.tags} compact />
        </Pressable>
        <View style={styles.songActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${song.title}`}
            style={styles.songIconButton}
            onPress={() => onOpenSongForEdit(undefined, song)}
          >
            <MaterialCommunityIcons name="pencil" size={21} color={theme.colors.action_edit} />
          </Pressable>
          {setlists.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${song.title} to a setlist`}
              style={styles.songIconButton}
              onPress={() => setCopyingSong({ song })}
            >
              <MaterialCommunityIcons
                name="playlist-plus"
                size={22}
                color={theme.colors.action_primary}
              />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${song.title}`}
            style={styles.songIconButton}
            onPress={() => confirmDeleteStandaloneSong(song)}
          >
            <MaterialCommunityIcons name="minus-circle" size={24} color={theme.colors.action_danger} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSongList = (songs: Song[]) => (
    <NestableDraggableFlatList
      // Remount when membership changes: growing this list in place while a setlist list shrinks crashed on iOS.
      key={songs.map((song) => song.id).join('|')}
      data={songs}
      keyExtractor={(song) => song.id}
      scrollEnabled={false}
      activationDistance={reorderEnabled ? 12 : 100000}
      onDragEnd={({ data }) => onReorderSongs(data.map((song) => song.id))}
      renderItem={({ item, drag, isActive }) => (
        <ScaleDecorator>{renderSongRow(item, songs.length, drag, isActive)}</ScaleDecorator>
      )}
    />
  );

  const renderSetlistCard = (
    setlist: SetlistWithSongs,
    indented: boolean,
    siblingCount: number,
    drag: () => void,
    isDragging: boolean,
  ) => {
    const expanded = Boolean(expansionState.expandedSetlists[setlist.id]);
            return (
            <View
              style={[
                styles.card,
                indented && styles.indentedCard,
                isDragging && styles.songRowDragging,
              ]}
            >
              <View style={styles.cardHeader}>
                {reorderEnabled && siblingCount > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reorder ${setlist.name}`}
                    onLongPress={drag}
                    delayLongPress={180}
                    style={styles.setlistDragHandle}
                  >
                    <Text style={styles.dragHandleText}>☰</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${setlist.name}`}
                  accessibilityState={{ expanded }}
                  onPress={() => toggleSetlist(setlist.id)}
                  style={styles.setlistExpandButton}
                >
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-down' : 'chevron-right'}
                    size={23}
                    color={theme.colors.text_secondary}
                  />
                </Pressable>
                <View style={styles.setlistHeading}>
                  <Text numberOfLines={1} style={styles.setlistName}>{setlist.name}</Text>
                  {(setlist.location || setlist.date || setlist.time) && (
                    <View style={styles.setlistDetailsRow}>
                      <View style={styles.setlistDetailsText}>
                        {!!setlist.location && (
                          hasMapTarget(setlist) ? (
                            <Pressable
                              accessibilityRole="link"
                              accessibilityLabel={`Open ${setlist.name} location in Maps`}
                              onPress={() => openInMaps(setlist).catch(() => undefined)}
                              hitSlop={{ top: 6, bottom: 6 }}
                              style={styles.setlistLocationLink}
                            >
                              <Text numberOfLines={1} style={[styles.setlistDetails, styles.setlistLocationText]}>
                                {setlist.location}
                              </Text>
                            </Pressable>
                          ) : (
                            <Text numberOfLines={1} style={styles.setlistDetails}>{setlist.location}</Text>
                          )
                        )}
                        {!!(setlist.date || setlist.time) && (
                          <Text numberOfLines={1} style={styles.setlistDetails}>
                            {[setlist.date, setlist.time].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.setlistActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${setlist.name}`}
                    accessibilityHint="Starts this setlist from the first song."
                    disabled={setlist.items.length === 0}
                    onPress={() => onOpenFlow(setlist)}
                    style={[
                      styles.iconButton,
                      setlist.items.length === 0 && styles.disabledIconButton,
                    ]}
                  >
                    <MaterialCommunityIcons name="play-circle" size={29} color={theme.colors.action_primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${setlist.name}`}
                    onPress={() => onOpenSetlistEditor(setlist)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="pencil" size={23} color={theme.colors.action_edit} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${setlist.name}`}
                    accessibilityHint="Choose to add a new song, copy a song from another setlist, or add a break."
                    onPress={() => openAddMenu(setlist)}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.action_primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${setlist.name}`}
                    onPress={() => confirmDeleteSetlist(setlist)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="minus-circle" size={27} color={theme.colors.action_danger} />
                  </Pressable>
                </View>
              </View>

              {expanded && setlist.items.length === 0 ? (
                <Text style={styles.songHint}>No songs or breaks in this setlist yet.</Text>
              ) : expanded ? (
                <NestableDraggableFlatList
                  data={setlist.items}
                  keyExtractor={(item) => `${item.kind}-${item.kind === 'song' ? item.song.id : item.id}`}
                  activationDistance={24}
                  onDragEnd={({ data }) => onReorderItems(setlist.id, data)}
                  renderItem={({ item, drag, isActive }) => (
                    <ScaleDecorator>
                      {item.kind === 'song' ? (
                        <View
                          ref={(node) => { targetRefs.current[`setlist:${setlist.id}:${item.song.id}`] = node; }}
                          collapsable={false}
                          style={[
                            styles.songRow,
                            isActive && styles.songRowDragging,
                            highlightKey === `setlist:${setlist.id}:${item.song.id}` && styles.songRowHighlight,
                          ]}
                        >
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Reorder ${item.song.title}`}
                            onLongPress={drag}
                            delayLongPress={180}
                            style={styles.dragHandle}
                          >
                            <Text style={styles.dragHandleText}>☰</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Play ${item.song.title}`}
                            style={styles.songHeading}
                            onPress={() => onOpenPerformance(
                            setlist.items,
                              setlist.items.findIndex((entry) =>
                                entry.kind === 'song' && entry.song.id === item.song.id,
                              ),
                            )}
                          >
                            <Text style={styles.songTitle}>{item.song.title}</Text>
                            <SongTags tags={item.song.tags} compact />
                          </Pressable>
                          <View style={styles.songActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${item.song.title}`}
                              style={styles.songIconButton}
                              onPress={() => onOpenSongForEdit(setlist.id, item.song)}
                            >
                              <MaterialCommunityIcons name="pencil" size={21} color={theme.colors.action_edit} />
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Copy ${item.song.title} to a setlist`}
                              style={styles.songIconButton}
                              onPress={() => setCopyingSong({
                                song: item.song,
                                sourceSetlistId: setlist.id,
                              })}
                            >
                              <MaterialCommunityIcons name="content-copy" size={20} color={theme.colors.action_copy} />
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Delete ${item.song.title} from ${setlist.name}`}
                              style={styles.songIconButton}
                              onPress={() => confirmDeleteSong(setlist.id, item.song)}
                            >
                              <MaterialCommunityIcons name="minus-circle" size={24} color={theme.colors.action_danger} />
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.songRow, isActive && styles.songRowDragging]}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Reorder break"
                            onLongPress={drag}
                            delayLongPress={180}
                            style={styles.dragHandle}
                          >
                            <Text style={styles.dragHandleText}>☰</Text>
                          </Pressable>
                          <Text style={[styles.songTitle, styles.breakTitle]}>
                            Break{item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete break from ${setlist.name}`}
                            style={styles.songIconButton}
                            onPress={() => confirmDeleteBreak(setlist.id, item.id)}
                          >
                            <MaterialCommunityIcons name="minus-circle" size={24} color={theme.colors.action_danger} />
                          </Pressable>
                        </View>
                      )}
                    </ScaleDecorator>
                  )}
                />
              ) : null}
            </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={theme.mode === 'dark'
            ? require('../../assets/branding/dots-logo.png')
            : require('../../assets/branding/dots-logo-light.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Dots"
        />
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'Close song search' : 'Search songs'}
            accessibilityState={{ expanded: searchOpen }}
            onPress={() => setSearchOpen((open) => !open)}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="text-search" size={22} color={theme.colors.action_edit} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create group"
            onPress={() => onOpenGroupEditor()}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="folder-plus" size={22} color={theme.colors.action_edit} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add setlist"
            accessibilityHint="Choose a new setlist or copy an existing one."
            onPress={openNewSetlistMenu}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="playlist-plus" size={22} color={theme.colors.action_primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add song"
            onPress={() => onCreateSong()}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="music-note-plus" size={22} color={theme.colors.action_primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            onPress={onOpenSettings}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.accent_highlight} />
          </Pressable>
        </View>
      </View>
      {searchOpen && (
        <SongSearchPanel
          entries={searchEntries}
          onClose={() => setSearchOpen(false)}
          onSelect={jumpToSong}
        />
      )}
      {backupReminder && (
        <View style={styles.backupBanner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back up your library in Settings"
            onPress={onOpenSettings}
            style={styles.backupBannerMain}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={theme.colors.accent_highlight} />
            <Text style={styles.backupBannerText}>
              Back up your library - export a copy from Settings.
            </Text>
          </Pressable>
          <View style={styles.backupBannerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remind me later"
              onPress={() => onSnoozeBackupReminder?.(BACKUP_REMIND_LATER_DAYS)}
              hitSlop={8}
            >
              <Text style={styles.backupBannerAction}>Remind me later</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss backup reminder"
              onPress={() => onSnoozeBackupReminder?.(BACKUP_REMINDER_DAYS)}
              hitSlop={8}
            >
              <Text style={styles.backupBannerAction}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}

      <NestableScrollContainer ref={scrollRef as never} style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View ref={contentRef} collapsable={false} style={styles.list}>
        {!hasAnyContent ? (
          <EmptyDashboard
            onCreateSetlist={() => onCreateSetlist(null)}
            onCreateGroup={() => onOpenGroupEditor()}
            onCreateSong={() => onCreateSong()}
            onImport={onImportLibrary}
          />
        ) : (
          <>
          {dashboardEntries.map((entry) => {
            if (entry.type === 'group') {
              const group = entry.group;
              const collapsed = Boolean(expansionState.collapsedGroups[group.id]);
              const groupSetlists = setlists.filter((setlist) => setlist.group_id === group.id);
              const groupSongCount = standaloneSongs.filter((song) => song.group_id === group.id).length;
              return (
                <View key={entry.key} style={styles.groupBranch}>
                  <View style={styles.groupHeader}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${group.name} group`}
                      accessibilityState={{ expanded: !collapsed }}
                      onPress={() => toggleGroup(group.id)}
                      style={styles.groupExpandButton}
                    >
                      <MaterialCommunityIcons
                        name={collapsed ? 'chevron-right' : 'chevron-down'}
                        size={22}
                        color={theme.colors.text_secondary}
                      />
                    </Pressable>
                    <MaterialCommunityIcons
                      name="folder"
                      size={20}
                      color={theme.colors.accent_highlight}
                    />
                    <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupCount}>{groupSetlists.length + groupSongCount}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add to ${group.name}`}
                      accessibilityHint="Choose a new setlist or a new song."
                      onPress={() => openGroupAddMenu(group)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="plus-circle" size={22} color={theme.colors.action_primary} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${group.name} group`}
                      onPress={() => onOpenGroupEditor(group)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="pencil" size={19} color={theme.colors.action_edit} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${group.name} group`}
                      onPress={() => confirmDeleteGroup(group)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="folder-remove" size={20} color={theme.colors.action_danger} />
                    </Pressable>
                  </View>
                </View>
              );
            }
            if (entry.type === 'songs') {
              return entry.songs.length > 0 ? (
                <View key={entry.key} style={[styles.standaloneSongs, styles.indentedCard]}>
                  {renderSongList(entry.songs)}
                </View>
              ) : null;
            }
            return (
              <React.Fragment key={entry.key}>
                {entry.setlists.length > 0 && (
                  <NestableDraggableFlatList
                    data={entry.setlists}
                    keyExtractor={(setlist) => setlist.id}
                    scrollEnabled={false}
                    activationDistance={reorderEnabled ? 12 : 100000}
                    containerStyle={styles.setlistReorderList}
                    onDragEnd={({ data }) => onReorderSetlists(data.map((setlist) => setlist.id))}
                    renderItem={({ item, drag, isActive }) => (
                      <ScaleDecorator>
                        {renderSetlistCard(item, entry.indented, entry.setlists.length, drag, isActive)}
                      </ScaleDecorator>
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
          {topLevelSongs.length > 0 && (
            <View style={styles.standaloneSongs}>
              <View style={styles.standaloneHeader}>
                <MaterialCommunityIcons
                  name="music-note"
                  size={20}
                  color={theme.colors.accent_highlight}
                />
                <Text style={styles.standaloneTitle}>Songs</Text>
              </View>
              {renderSongList(topLevelSongs)}
            </View>
          )}
          </>
        )}
        </View>
      </NestableScrollContainer>

      <Modal
        visible={addingBreakTo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingBreakTo(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.renameDialog}>
              <Text style={styles.dialogTitle}>Add a break</Text>
              <Text style={styles.copyHint}>Duration in minutes (optional; display only).</Text>
              <TextInput
                value={breakDuration}
                onChangeText={setBreakDuration}
                keyboardType="number-pad"
                placeholder="e.g. 15"
                placeholderTextColor={theme.colors.text_secondary}
                style={styles.renameInput}
                accessibilityLabel="Break duration in minutes"
              />
              <View style={styles.dialogActions}>
                <Pressable onPress={() => setAddingBreakTo(null)} style={styles.dialogButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveBreak}
                  disabled={!durationIsValid}
                  style={[styles.dialogButton, !durationIsValid && styles.disabledAction]}
                >
                  <Text style={styles.saveText}>Add break</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={variantFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVariantFor(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.renameDialog}>
              <Text style={styles.dialogTitle}>New version of “{variantFor?.song.title}”</Text>
              <Text style={styles.copyHint}>
                Songs with the same title need different tags, e.g. Piano or Guitar. The copy has its
                own chords and notes and can be edited separately.
              </Text>
              <SongTags tags={variantFor?.song.tags} compact wrapCompact />
              <TextInput
                autoFocus
                value={variantName}
                onChangeText={setVariantName}
                onSubmitEditing={createVariant}
                placeholder="New tag, e.g. Piano"
                placeholderTextColor={theme.colors.text_secondary}
                style={[styles.renameInput, styles.variantInput]}
                accessibilityLabel="Tag for the new version"
              />
              <View style={styles.variantColors}>
                {TAG_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose tag color ${color}`}
                    accessibilityState={{ selected: variantColor === color }}
                    onPress={() => setVariantColor(color)}
                    style={[
                      styles.variantSwatch,
                      { backgroundColor: color },
                      variantColor === color && styles.variantSwatchSelected,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.dialogActions}>
                <Pressable onPress={() => setVariantFor(null)} style={styles.dialogButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={createVariant}
                  disabled={!variantName.trim()}
                  style={[styles.dialogButton, !variantName.trim() && styles.disabledAction]}
                >
                  <Text style={styles.saveText}>Create version</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={copyingSong !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyingSong(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.renameDialog}>
              <Text style={styles.dialogTitle}>
                {copyingSong?.sourceSetlistId ? 'Copy song to setlist' : 'Add song to setlist'}
              </Text>
              <Text style={styles.copyHint}>
                Choose a destination for “{copyingSong?.song.title}”.
              </Text>
              <SongTags tags={copyingSong?.song.tags} compact wrapCompact />
              <ScrollView style={styles.destinationList}>
                {setlists.map((setlist) => (
                  <Pressable
                    key={setlist.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${copyingSong?.sourceSetlistId ? 'Copy song' : 'Add song'} to ${setlist.name}`}
                    onPress={() => copySongTo(setlist.id)}
                    style={styles.destinationButton}
                  >
                    <MaterialCommunityIcons
                      name="playlist-plus"
                      size={22}
                      color={theme.colors.action_primary}
                    />
                    <Text numberOfLines={1} style={styles.destinationText}>
                      {setlist.name}
                      {copyingSong?.sourceSetlistId && setlist.id === copyingSong.sourceSetlistId
                        ? ' (this setlist – new version)'
                        : ''}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.dialogActions}>
                <Pressable onPress={() => setCopyingSong(null)} style={styles.dialogButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <View style={styles.centeredBackdrop}>
          <View style={styles.renameDialog}>
            <Text style={styles.dialogTitle}>{menu?.title}</Text>
            {menu?.options.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  setMenu(null);
                  option.onPress();
                }}
                style={styles.destinationButton}
              >
                <MaterialCommunityIcons name={option.icon} size={22} color={theme.colors.action_primary} />
                <Text numberOfLines={1} style={styles.destinationText}>{option.label}</Text>
              </Pressable>
            ))}
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setMenu(null)} style={styles.dialogButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.centeredBackdrop}>
          <View style={styles.renameDialog}>
            <Text style={styles.dialogTitle}>
              {picker?.kind === 'copy-setlist'
                ? 'Copy which setlist?'
                : pickerSource ? `Copy a song from ${pickerSource.name}` : 'Copy from where?'}
            </Text>
            <ScrollView style={styles.destinationList}>
              {pickerSource
                ? pickerSource.items.flatMap((item) => (item.kind === 'song' ? [item.song] : [])).map((song) => (
                    <Pressable
                      key={song.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy ${song.title}`}
                      onPress={() => {
                        if (picker?.kind !== 'copy-song') {
                          return;
                        }
                        try {
                          onCopySong(song.id, picker.targetSetlistId);
                          setPicker(null);
                        } catch (error) {
                          Alert.alert('Copy failed', error instanceof Error ? error.message : 'An unexpected error occurred.');
                        }
                      }}
                      style={styles.destinationButton}
                    >
                      <MaterialCommunityIcons name="music-note" size={22} color={theme.colors.action_primary} />
                      <Text numberOfLines={1} style={styles.destinationText}>{song.title}</Text>
                      <SongTags tags={song.tags} compact />
                    </Pressable>
                  ))
                : [
                    ...(picker?.kind === 'copy-song' && standaloneSongs.length > 0
                      ? [{ id: STANDALONE_SOURCE, name: 'Songs', items: [], standalone: true }]
                      : []),
                    ...setlists.map((setlist) => ({ ...setlist, standalone: false })),
                  ]
                    .filter((setlist) => setlist.standalone || picker?.kind === 'copy-setlist' || (
                      picker?.kind === 'copy-song' &&
                      setlist.id !== picker.targetSetlistId &&
                      setlist.items.some((item) => item.kind === 'song')
                    ))
                    .map((setlist) => (
                      <Pressable
                        key={setlist.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose ${setlist.name}`}
                        onPress={() => {
                          if (picker?.kind === 'copy-setlist') {
                            setPicker(null);
                            const original = setlists.find((item) => item.id === setlist.id);
                            if (original) {
                              copyEntireSetlist(original);
                            }
                          } else if (picker?.kind === 'copy-song') {
                            setPicker({ ...picker, sourceSetlistId: setlist.id });
                          }
                        }}
                        style={styles.destinationButton}
                      >
                        <MaterialCommunityIcons
                          name={setlist.standalone ? 'music-note' : 'playlist-music'}
                          size={22}
                          color={theme.colors.action_primary}
                        />
                        <Text numberOfLines={1} style={styles.destinationText}>
                          {setlist.standalone ? 'Songs (not in a setlist)' : setlist.name}
                        </Text>
                      </Pressable>
                    ))}
            </ScrollView>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setPicker(null)} style={styles.dialogButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Interpolates between narrow (<=320pt) and roomy (>=430pt) screens so small phones keep title space.
const scaleByWidth = (screenWidth: number, narrow: number, roomy: number) => {
  const t = Math.max(0, Math.min(1, (screenWidth - 320) / 110));
  return Math.round(narrow + (roomy - narrow) * t);
};

const createStyles = (theme: AppTheme, screenWidth: number) => StyleSheet.create({
  backupBanner: {
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent_highlight,
    backgroundColor: theme.colors.surface,
  },
  backupBannerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backupBannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  backupBannerAction: {
    color: theme.colors.accent_highlight,
    fontSize: 14,
    fontWeight: '600',
  },
  backupBannerText: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionButton: {
    width: scaleByWidth(screenWidth, 34, 40),
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 58,
    height: 18,
    marginLeft: 28,
  },
  list: {
    paddingBottom: 24,
    gap: 14,
  },
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: 14,
  },
  standaloneSongs: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.surface,
  },
  standaloneHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standaloneTitle: {
    color: theme.colors.text_primary,
    fontSize: 17,
    fontWeight: theme.typography.font_weight_bold,
  },
  indentedCard: {
    marginLeft: 24,
  },
  groupBranch: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border_contrast,
    marginLeft: 10,
    paddingLeft: 8,
  },
  groupHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  groupExpandButton: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 17,
    fontWeight: theme.typography.font_weight_bold,
  },
  groupCount: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  groupAction: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  setlistExpandButton: {
    width: 32,
    flexShrink: 0,
    marginRight: scaleByWidth(screenWidth, 0, 6),
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setlistName: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 20,
    fontWeight: theme.typography.font_weight_bold,
  },
  setlistHeading: {
    flex: 1,
    minWidth: 0,
  },
  setlistDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  setlistDetailsText: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  setlistLocationLink: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  setlistLocationText: {
    color: theme.colors.accent_highlight,
    textDecorationLine: 'underline',
  },
  setlistDetails: {
    flexShrink: 1,
    color: theme.colors.text_secondary,
    fontSize: 12,
  },
  iconButton: {
    width: scaleByWidth(screenWidth, 30, 40),
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledIconButton: {
    opacity: 0.4,
  },
  setlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  compactIconButton: {
    width: scaleByWidth(screenWidth, 28, 34),
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  renameDialog: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  dialogTitle: {
    color: theme.colors.text_primary,
    fontSize: 18,
    fontWeight: theme.typography.font_weight_bold,
    marginBottom: 14,
  },
  renameInput: {
    color: theme.colors.text_primary,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  dialogButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    color: theme.colors.text_secondary,
  },
  saveText: {
    color: theme.colors.action_primary,
    fontWeight: theme.typography.font_weight_bold,
  },
  disabledAction: {
    opacity: 0.4,
  },
  variantInput: {
    marginTop: 10,
  },
  variantColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  variantSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  variantSwatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text_primary,
  },
  copyHint: {
    color: theme.colors.text_secondary,
    marginBottom: 10,
  },
  destinationList: {
    maxHeight: 280,
  },
  destinationButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
    paddingHorizontal: 4,
  },
  destinationText: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 16,
  },
  songHint: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  songRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
  },
  songRowHighlight: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.accent_highlight,
  },
  songRowDragging: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  dragHandle: {
    minWidth: 36,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  centeredBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.overlay,
  },
  setlistDragHandle: {
    width: 24,
    flexShrink: 0,
    minHeight: 40,
    marginRight: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setlistReorderList: {
    gap: 14,
  },
  dragHandleText: {
    color: theme.colors.text_secondary,
    fontSize: 18,
  },
  songTitle: {
    color: theme.colors.text_primary,
    fontSize: 16,
    flex: 1,
  },
  songHeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  songActions: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    marginLeft: 8,
  },
  breakTitle: {
    color: theme.colors.accent_highlight,
    fontStyle: 'italic',
  },
  songIconButton: {
    width: 34,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
