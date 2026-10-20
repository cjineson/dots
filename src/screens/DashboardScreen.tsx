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
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import EmptyDashboard from '../components/EmptyDashboard';
import SongTags from '../components/SongTags';
import { useTheme } from '../themeContext';
import { hasMapTarget, openInMaps } from '../lib/maps';
import { UNGROUPED_SONGS_SETLIST_NAME } from '../lib/ungrouped';
import { BACKUP_REMIND_LATER_DAYS, BACKUP_REMINDER_DAYS } from '../lib/settings';
import type { AppTheme } from '../theme';
import type {
  DashboardExpansionState,
  SetlistGroup,
  SetlistItem,
  SetlistWithSongs,
  Song,
} from '../types';

type DashboardScreenProps = {
  setlists: SetlistWithSongs[];
  groups: SetlistGroup[];
  expansionState: DashboardExpansionState;
  onExpansionStateChange: (state: DashboardExpansionState) => void;
  onCreateSetlist: (groupId?: string | null) => void;
  onOpenGroupEditor: (group?: SetlistGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenSetlistEditor: (setlist: SetlistWithSongs) => void;
  onDeleteSetlist: (setlistId: string) => void;
  onCopySetlist: (setlistId: string) => void;
  onCopySong: (songId: string, targetSetlistId: string) => void;
  onDeleteSong: (setlistId: string, songId: string) => void;
  onKeepSongUngrouped: (setlistId: string, songId: string) => void;
  onDeleteBreak: (setlistId: string, breakId: string) => void;
  onCreateBreak: (setlistId: string, durationMinutes?: number) => void;
  onOpenFlow: (setlist: SetlistWithSongs) => void;
  onOpenSongForEdit: (setlistId: string, song?: Song) => void;
  onOpenPerformance: (
    setlist: SetlistWithSongs,
    items: SetlistItem[],
    index: number,
  ) => void;
  onOpenNewSong: (setlistId: string) => void;
  onReorderSetlists: (orderedIds: string[]) => void;
  onReorderItems: (setlistId: string, items: SetlistItem[]) => void;
  onOpenSettings: () => void;
  backupReminder?: boolean;
  onSnoozeBackupReminder?: (days: number) => void;
};

export default function DashboardScreen({
  setlists,
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
  onKeepSongUngrouped,
  onDeleteBreak,
  onCreateBreak,
  onOpenFlow,
  onOpenSongForEdit,
  onOpenPerformance,
  onOpenNewSong,
  onReorderSetlists,
  onReorderItems,
  onOpenSettings,
  backupReminder = false,
  onSnoozeBackupReminder,
}: DashboardScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    sourceSetlistId: string;
  } | null>(null);

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
      `Delete "${setlist.name}" and its songs and breaks? Songs used in other setlists will be kept.`,
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
          label: 'Copy song from another setlist',
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

  const openNewSetlistMenu = () => {
    setMenu({
      title: 'Add setlist',
      options: [
        { label: 'Add new setlist', icon: 'playlist-plus', onPress: () => onCreateSetlist(null) },
        { label: 'Add new setlist from existing', icon: 'content-copy', onPress: () => setPicker({ kind: 'copy-setlist' }) },
      ],
    });
  };

  const pickerSource = picker?.kind === 'copy-song'
    ? setlists.find((setlist) => setlist.id === picker.sourceSetlistId)
    : undefined;

  const copySongTo = (targetSetlistId: string) => {
    if (!copyingSong) {
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
    const currentSetlist = setlists.find((setlist) => setlist.id === setlistId);
    const isUngroupedHolder =
      currentSetlist?.name === UNGROUPED_SONGS_SETLIST_NAME && !currentSetlist.group_id;

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
        onPress: run(() => onDeleteSong(setlistId, song.id)),
      },
    ];
    if (!isUngroupedHolder) {
      buttons.splice(1, 0, {
        text: 'Keep ungrouped',
        onPress: run(() => onKeepSongUngrouped(setlistId, song.id)),
      });
    }
    Alert.alert(
      'This is the last setlist for this song',
      `"${song.title}" isn't in any other setlist. Remove it permanently, or keep it ungrouped in "${UNGROUPED_SONGS_SETLIST_NAME}"?`,
      buttons,
    );
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
          }]
        : []),
    ]),
  ];
  const hasAnySetlists = setlists.length > 0 || groups.length > 0;

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
                          <Text numberOfLines={1} style={styles.setlistDetails}>{setlist.location}</Text>
                        )}
                        {!!(setlist.date || setlist.time) && (
                          <Text numberOfLines={1} style={styles.setlistDetails}>
                            {[setlist.date, setlist.time].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                      {hasMapTarget(setlist) && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${setlist.name} location in Maps`}
                          onPress={() => openInMaps(setlist).catch(() => undefined)}
                          style={styles.mapPinButton}
                        >
                          <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={18}
                            color={theme.colors.accent_highlight}
                          />
                        </Pressable>
                      )}
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
                    <MaterialCommunityIcons name="play-circle" size={29} color="#4FC3F7" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${setlist.name}`}
                    onPress={() => onOpenSetlistEditor(setlist)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="pencil" size={23} color="#FFB74D" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${setlist.name}`}
                    accessibilityHint="Choose to add a new song, copy a song from another setlist, or add a break."
                    onPress={() => openAddMenu(setlist)}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="#4FC3F7" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${setlist.name}`}
                    onPress={() => confirmDeleteSetlist(setlist)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="minus-circle" size={27} color="#FF8A80" />
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
                        <View style={[styles.songRow, isActive && styles.songRowDragging]}>
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
                              setlist,
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
                              <MaterialCommunityIcons name="pencil" size={21} color="#FFB74D" />
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
                              <MaterialCommunityIcons name="content-copy" size={20} color="#B39DDB" />
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Delete ${item.song.title} from ${setlist.name}`}
                              style={styles.songIconButton}
                              onPress={() => confirmDeleteSong(setlist.id, item.song)}
                            >
                              <MaterialCommunityIcons name="minus-circle" size={24} color="#FF8A80" />
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
                            accessibilityLabel={`Show break${item.duration_minutes ? `, ${item.duration_minutes} minutes` : ''} in performance`}
                            style={styles.songIconButton}
                            onPress={() => onOpenPerformance(
                              setlist,
                              setlist.items,
                              setlist.items.findIndex(
                                (entry) => entry.kind === 'break' && entry.id === item.id,
                              ),
                            )}
                          >
                            <MaterialCommunityIcons name="play-circle" size={24} color="#4FC3F7" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete break from ${setlist.name}`}
                            style={styles.songIconButton}
                            onPress={() => confirmDeleteBreak(setlist.id, item.id)}
                          >
                            <MaterialCommunityIcons name="minus-circle" size={24} color="#FF8A80" />
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
          source={require('../../assets/branding/gigbox-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="GigBox"
        />
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create group"
            onPress={() => onOpenGroupEditor()}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="folder-plus" size={22} color="#FFB74D" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add setlist"
            accessibilityHint="Choose a new setlist or copy an existing one."
            onPress={openNewSetlistMenu}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="plus-circle" size={22} color="#4FC3F7" />
          </Pressable>
        </View>
      </View>
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
              Back up your setlists - export a copy from Settings.
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

      <NestableScrollContainer style={styles.scroll} contentContainerStyle={styles.list}>
        {!hasAnySetlists ? (
          <EmptyDashboard onCreateSetlist={() => onCreateSetlist(null)} />
        ) : (
          dashboardEntries.map((entry) => {
            if (entry.type === 'group') {
              const group = entry.group;
              const collapsed = Boolean(expansionState.collapsedGroups[group.id]);
              const groupSetlists = setlists.filter((setlist) => setlist.group_id === group.id);
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
                    <Text style={styles.groupCount}>{groupSetlists.length}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add setlist to ${group.name}`}
                      onPress={() => onCreateSetlist(group.id)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="playlist-plus" size={22} color="#4FC3F7" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${group.name} group`}
                      onPress={() => onOpenGroupEditor(group)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="pencil" size={19} color="#FFB74D" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${group.name} group`}
                      onPress={() => confirmDeleteGroup(group)}
                      style={styles.groupAction}
                    >
                      <MaterialCommunityIcons name="folder-remove" size={20} color="#FF8A80" />
                    </Pressable>
                  </View>
                </View>
              );
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
          })
        )}
      </NestableScrollContainer>

      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.bottomBarButton}
          onPress={onOpenSettings}
        >
          <MaterialCommunityIcons name="cog" size={28} color={theme.colors.accent_highlight} />
          <Text numberOfLines={1} style={styles.settingsLabel}>Settings</Text>
        </Pressable>
      </View>

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
              <Text style={styles.dialogTitle}>Copy song to setlist</Text>
              <Text style={styles.copyHint}>
                Choose a destination for “{copyingSong?.song.title}”.
              </Text>
              <ScrollView style={styles.destinationList}>
                {setlists.map((setlist) => (
                  <Pressable
                    key={setlist.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy song to ${setlist.name}`}
                    onPress={() => copySongTo(setlist.id)}
                    style={styles.destinationButton}
                  >
                    <MaterialCommunityIcons
                      name="playlist-plus"
                      size={22}
                      color="#4FC3F7"
                    />
                    <Text numberOfLines={1} style={styles.destinationText}>
                      {setlist.name}
                      {setlist.id === copyingSong?.sourceSetlistId ? ' (current)' : ''}
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
                <MaterialCommunityIcons name={option.icon} size={22} color="#4FC3F7" />
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
                : pickerSource ? `Copy a song from ${pickerSource.name}` : 'Copy from which setlist?'}
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
                      <MaterialCommunityIcons name="music-note" size={22} color="#4FC3F7" />
                      <Text numberOfLines={1} style={styles.destinationText}>{song.title}</Text>
                    </Pressable>
                  ))
                : setlists
                    .filter((setlist) => picker?.kind === 'copy-setlist' || (
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
                            copyEntireSetlist(setlist);
                          } else if (picker?.kind === 'copy-song') {
                            setPicker({ ...picker, sourceSetlistId: setlist.id });
                          }
                        }}
                        style={styles.destinationButton}
                      >
                        <MaterialCommunityIcons name="playlist-music" size={22} color="#4FC3F7" />
                        <Text numberOfLines={1} style={styles.destinationText}>{setlist.name}</Text>
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 112,
    height: 32,
  },
  list: {
    paddingBottom: 24,
    gap: 14,
  },
  scroll: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 64,
    marginTop: 8,
    gap: 12,
  },
  bottomBarButton: {
    minWidth: 0,
    flexShrink: 1,
    paddingHorizontal: 8,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  settingsLabel: {
    color: theme.colors.accent_highlight,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 28,
    fontWeight: theme.typography.font_weight_bold,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: 14,
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
    width: 20,
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
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mapPinButton: {
    width: 32,
    height: 32,
    marginLeft: 8,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setlistDetails: {
    flexShrink: 1,
    color: theme.colors.text_secondary,
    fontSize: 12,
  },
  iconButton: {
    width: 40,
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
    width: 34,
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
    color: '#4FC3F7',
    fontWeight: theme.typography.font_weight_bold,
  },
  disabledAction: {
    opacity: 0.4,
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
    width: 20,
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
