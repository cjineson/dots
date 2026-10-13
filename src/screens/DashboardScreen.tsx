import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Modal,
  Pressable,
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

import { theme } from '../theme';
import type { SetlistItem, SetlistWithSongs, Song } from '../types';

type DashboardScreenProps = {
  setlists: SetlistWithSongs[];
  onCreateSetlist: () => void;
  onRenameSetlist: (
    setlistId: string,
    name: string,
    details: { location?: string; date?: string; time?: string },
  ) => void;
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
  onCreateSetlist,
  onRenameSetlist,
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
  const [editingSetlist, setEditingSetlist] = React.useState<SetlistWithSongs | null>(null);
  const [setlistName, setSetlistName] = React.useState('');
  const [setlistLocation, setSetlistLocation] = React.useState('');
  const [setlistDate, setSetlistDate] = React.useState('');
  const [setlistTime, setSetlistTime] = React.useState('');
  const [addingBreakTo, setAddingBreakTo] = React.useState<string | null>(null);
  const [breakDuration, setBreakDuration] = React.useState('');
  const [copyingSong, setCopyingSong] = React.useState<{
    song: Song;
    sourceSetlistId: string;
  } | null>(null);

  const openRenameSetlist = (setlist: SetlistWithSongs) => {
    setEditingSetlist(setlist);
    setSetlistName(setlist.name);
    setSetlistLocation(setlist.location ?? '');
    setSetlistDate(setlist.date ?? '');
    setSetlistTime(setlist.time ?? '');
  };

  const saveSetlistName = () => {
    if (!editingSetlist || !setlistName.trim()) {
      return;
    }
    try {
      onRenameSetlist(editingSetlist.id, setlistName, {
        location: setlistLocation,
        date: setlistDate,
        time: setlistTime,
      });
      setEditingSetlist(null);
    } catch (error) {
      Alert.alert(
        'Rename failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/branding/gigbox-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="GigBox"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create setlist"
          onPress={onCreateSetlist}
          style={styles.iconButton}
        >
          <MaterialCommunityIcons name="plus-circle" size={30} color="#4FC3F7" />
        </Pressable>
      </View>

      <NestableScrollContainer style={styles.scroll} contentContainerStyle={styles.list}>
        {setlists.length === 0 ? (
          <Text style={styles.emptyState}>No setlists yet. Create one to begin.</Text>
        ) : (
          setlists.map((setlist) => (
            <View key={setlist.id} style={styles.card}>
              <View style={styles.cardHeader}>
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
                    onPress={() => openRenameSetlist(setlist)}
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

              {setlist.items.length === 0 ? (
                <Text style={styles.songHint}>No songs or breaks in this setlist yet.</Text>
              ) : (
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
                          <Text style={styles.songTitle}>{item.song.title}</Text>
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
              )}
            </View>
          ))
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
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import setlists from JSON"
          style={styles.bottomBarButton}
          onPress={onImportLibrary}
        >
          <MaterialCommunityIcons name="database-import" size={28} color="#FFB74D" />
        </Pressable>
      </View>

      <Modal
        visible={editingSetlist !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSetlist(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.renameDialog}>
            <Text style={styles.dialogTitle}>Setlist details</Text>
            <TextInput
              autoFocus
              value={setlistName}
              onChangeText={setSetlistName}
              onSubmitEditing={saveSetlistName}
              returnKeyType="done"
              selectTextOnFocus
              style={styles.renameInput}
              accessibilityLabel="Setlist name"
            />
            <TextInput
              value={setlistLocation}
              onChangeText={setSetlistLocation}
              placeholder="Location (optional)"
              placeholderTextColor={theme.colors.text_secondary}
              style={[styles.renameInput, styles.metadataInput]}
              accessibilityLabel="Setlist location"
            />
            <TextInput
              value={setlistDate}
              onChangeText={setSetlistDate}
              placeholder="Date (optional)"
              placeholderTextColor={theme.colors.text_secondary}
              style={[styles.renameInput, styles.metadataInput]}
              accessibilityLabel="Setlist date"
            />
            <TextInput
              value={setlistTime}
              onChangeText={setSetlistTime}
              placeholder="Time (optional)"
              placeholderTextColor={theme.colors.text_secondary}
              style={[styles.renameInput, styles.metadataInput]}
              accessibilityLabel="Setlist time"
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setEditingSetlist(null)} style={styles.dialogButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveSetlistName}
                disabled={!setlistName.trim()}
                style={[styles.dialogButton, !setlistName.trim() && styles.disabledAction]}
              >
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addingBreakTo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingBreakTo(null)}
      >
        <View style={styles.modalBackdrop}>
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
        </View>
      </Modal>

      <Modal
        visible={copyingSong !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyingSong(null)}
      >
        <View style={styles.modalBackdrop}>
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
        </View>
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
    width: 56,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000000AA',
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
  metadataInput: {
    marginTop: 10,
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
  songActions: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
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
