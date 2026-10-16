import React from 'react';
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

import SongTags from '../components/SongTags';
import { theme } from '../theme';
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
  onReorderItems: (setlistId: string, items: SetlistItem[]) => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
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
  onDeleteBreak,
  onCreateBreak,
  onOpenFlow,
  onOpenSongForEdit,
  onOpenPerformance,
  onOpenNewSong,
  onReorderItems,
  onExportLibrary,
  onImportLibrary,
}: DashboardScreenProps) {
  const [addingBreakTo, setAddingBreakTo] = React.useState<string | null>(null);
  const [breakDuration, setBreakDuration] = React.useState('');
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
    Alert.alert(
      'Delete song from setlist?',
      `Remove "${song.title}" from this setlist? Songs used in other setlists will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              onDeleteSong(setlistId, song.id);
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
    ...setlists
      .filter((setlist) => !setlist.group_id)
      .map((setlist) => ({ type: 'setlist' as const, setlist, indented: false })),
    ...groups.flatMap((group) => [
      { type: 'group' as const, group },
      ...(!expansionState.collapsedGroups[group.id]
        ? setlists
            .filter((setlist) => setlist.group_id === group.id)
            .map((setlist) => ({ type: 'setlist' as const, setlist, indented: true }))
        : []),
    ]),
  ];

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
            accessibilityLabel="Create ungrouped setlist"
            onPress={() => onCreateSetlist(null)}
            style={styles.headerActionButton}
          >
            <MaterialCommunityIcons name="plus-circle" size={22} color="#4FC3F7" />
          </Pressable>
        </View>
      </View>

      <NestableScrollContainer style={styles.scroll} contentContainerStyle={styles.list}>
        {dashboardEntries.length === 0 ? (
          <Text style={styles.emptyState}>No setlists yet. Create one to begin.</Text>
        ) : (
          dashboardEntries.map((entry) => {
            if (entry.type === 'group') {
              const group = entry.group;
              const collapsed = Boolean(expansionState.collapsedGroups[group.id]);
              const groupSetlists = setlists.filter((setlist) => setlist.group_id === group.id);
              return (
                <View key={`group-${group.id}`} style={styles.groupBranch}>
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
            const setlist = entry.setlist;
            const expanded = Boolean(expansionState.expandedSetlists[setlist.id]);
            return (
            <View
              key={setlist.id}
              style={[
                styles.card,
                entry.indented && styles.indentedCard,
              ]}
            >
              <View style={styles.cardHeader}>
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
                    <Text numberOfLines={1} style={styles.setlistDetails}>
                      {[setlist.location, setlist.date, setlist.time].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={styles.setlistActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${setlist.name} flow view`}
                    accessibilityHint="Shows all songs and breaks in this setlist."
                    disabled={setlist.items.length === 0}
                    onPress={() => onOpenFlow(setlist)}
                    style={[
                      styles.iconButton,
                      setlist.items.length === 0 && styles.disabledIconButton,
                    ]}
                  >
                    <MaterialCommunityIcons name="playlist-play" size={27} color="#4FC3F7" />
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
                    accessibilityLabel={`Copy ${setlist.name}`}
                    onPress={() => copyEntireSetlist(setlist)}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="content-copy" size={21} color="#4FC3F7" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add song to ${setlist.name}`}
                    accessibilityHint="Opens the song editor to add a song."
                    onPress={() => onOpenNewSong(setlist.id)}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="#4FC3F7" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add break to ${setlist.name}`}
                    accessibilityHint="Adds a standalone break, optionally with a display-only duration."
                    onPress={() => {
                      setBreakDuration('');
                      setAddingBreakTo(setlist.id);
                    }}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="coffee" size={22} color="#FFB74D" />
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
                          <View style={styles.songHeading}>
                            <Text style={styles.songTitle}>{item.song.title}</Text>
                            <SongTags tags={item.song.tags} compact />
                          </View>
                          <View style={styles.songActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Play ${item.song.title}`}
                              style={styles.songIconButton}
                              onPress={() => onOpenPerformance(
                                setlist,
                                setlist.items,
                                setlist.items.findIndex((entry) =>
                                  entry.kind === 'song' && entry.song.id === item.song.id,
                                ),
                              )}
                            >
                              <MaterialCommunityIcons name="play-circle" size={24} color="#4FC3F7" />
                            </Pressable>
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
                              <MaterialCommunityIcons name="delete" size={21} color="#FF8A80" />
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
                            <MaterialCommunityIcons name="delete" size={21} color="#FF8A80" />
                          </Pressable>
                        </View>
                      )}
                    </ScaleDecorator>
                  )}
                />
              ) : null}
            </View>
            );
          })
        )}
      </NestableScrollContainer>

      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export setlists as JSON"
          style={styles.bottomBarButton}
          onPress={onExportLibrary}
        >
          <MaterialCommunityIcons name="database-export" size={28} color="#4FC3F7" />
          <Text style={styles.exportLabel}>Export</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import setlists from JSON"
          style={styles.bottomBarButton}
          onPress={onImportLibrary}
        >
          <MaterialCommunityIcons name="database-import" size={28} color="#FFB74D" />
          <Text style={styles.importLabel}>Import</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 84,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  exportLabel: {
    color: '#4FC3F7',
    fontSize: 13,
    lineHeight: 28,
    fontWeight: theme.typography.font_weight_bold,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  importLabel: {
    color: '#FFB74D',
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
    gap: 8,
    marginBottom: 10,
  },
  setlistExpandButton: {
    width: 24,
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
  setlistDetails: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    marginTop: 2,
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
    backgroundColor: '#000000AA',
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
  emptyState: {
    color: theme.colors.text_secondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
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
