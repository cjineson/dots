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
import type { SetlistWithSongs, Song } from '../types';

type DashboardScreenProps = {
  setlists: SetlistWithSongs[];
  onCreateSetlist: () => void;
  onRenameSetlist: (setlistId: string, name: string) => void;
  onDeleteSetlist: (setlistId: string) => void;
  onCopySetlist: (setlistId: string) => void;
  onCopySong: (songId: string, targetSetlistId: string) => void;
  onOpenFlow: (setlist: SetlistWithSongs) => void;
  onOpenSongForEdit: (setlistId: string, song?: Song) => void;
  onOpenPerformance: (songs: Song[], index: number) => void;
  onOpenNewSong: (setlistId: string) => void;
  onReorderSongs: (setlistId: string, songs: Song[]) => void;
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
  onOpenFlow,
  onOpenSongForEdit,
  onOpenPerformance,
  onOpenNewSong,
  onReorderSongs,
  onExportLibrary,
  onImportLibrary,
}: DashboardScreenProps) {
  const [editingSetlist, setEditingSetlist] = React.useState<SetlistWithSongs | null>(null);
  const [setlistName, setSetlistName] = React.useState('');
  const [copyingSong, setCopyingSong] = React.useState<{
    song: Song;
    sourceSetlistId: string;
  } | null>(null);

  const openRenameSetlist = (setlist: SetlistWithSongs) => {
    setEditingSetlist(setlist);
    setSetlistName(setlist.name);
  };

  const saveSetlistName = () => {
    if (!editingSetlist || !setlistName.trim()) {
      return;
    }
    try {
      onRenameSetlist(editingSetlist.id, setlistName);
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
      `Delete "${setlist.name}" and its songs? Songs used in other setlists will be kept.`,
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
                <Text numberOfLines={1} style={styles.setlistName}>{setlist.name}</Text>
                <View style={styles.setlistActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${setlist.name} flow view`}
                    disabled={setlist.songs.length === 0}
                    onPress={() => onOpenFlow(setlist)}
                    style={[
                      styles.iconButton,
                      setlist.songs.length === 0 && styles.disabledIconButton,
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
                    accessibilityLabel={`Delete ${setlist.name}`}
                    onPress={() => confirmDeleteSetlist(setlist)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="minus-circle" size={27} color="#FF8A80" />
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
                    onPress={() => onOpenNewSong(setlist.id)}
                    style={styles.compactIconButton}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="#4FC3F7" />
                  </Pressable>
                </View>
              </View>

              {setlist.songs.length === 0 ? (
                <Text style={styles.songHint}>No songs in this setlist yet.</Text>
              ) : (
                <NestableDraggableFlatList
                  data={setlist.songs}
                  keyExtractor={(song) => song.id}
                  activationDistance={8}
                  onDragEnd={({ data }) => onReorderSongs(setlist.id, data)}
                  renderItem={({ item: song, drag, isActive }) => (
                    <ScaleDecorator>
                      <View style={[styles.songRow, isActive && styles.songRowDragging]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Reorder ${song.title}`}
                          onLongPress={drag}
                          delayLongPress={180}
                          style={styles.dragHandle}
                        >
                          <Text style={styles.dragHandleText}>☰</Text>
                        </Pressable>
                        <Text style={styles.songTitle}>{song.title}</Text>
                        <View style={styles.songActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${song.title}`}
                            style={styles.songIconButton}
                            onPress={() => onOpenSongForEdit(setlist.id, song)}
                          >
                            <MaterialCommunityIcons name="pencil" size={21} color="#FFB74D" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Play ${song.title}`}
                            style={styles.songIconButton}
                            onPress={() => onOpenPerformance(setlist.songs, setlist.songs.findIndex((item) => item.id === song.id))}
                          >
                            <MaterialCommunityIcons name="play-circle" size={24} color="#4FC3F7" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Copy ${song.title} to a setlist`}
                            style={styles.songIconButton}
                            onPress={() => setCopyingSong({
                              song,
                              sourceSetlistId: setlist.id,
                            })}
                          >
                            <MaterialCommunityIcons name="content-copy" size={20} color="#B39DDB" />
                          </Pressable>
                        </View>
                      </View>
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
            <Text style={styles.dialogTitle}>Rename setlist</Text>
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
  songIconButton: {
    width: 34,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
