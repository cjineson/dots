import React, { useState } from 'react';
import {
  Button,
  Pressable,
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
  onCreateSetlist: (name: string) => void;
  onOpenSongForEdit: (setlistId: string, song?: Song) => void;
  onOpenPerformance: (song: Song) => void;
  onOpenNewSong: (setlistId: string) => void;
  onReorderSongs: (setlistId: string, songs: Song[]) => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
};

export default function DashboardScreen({
  setlists,
  onCreateSetlist,
  onOpenSongForEdit,
  onOpenPerformance,
  onOpenNewSong,
  onReorderSongs,
  onExportLibrary,
  onImportLibrary,
}: DashboardScreenProps) {
  const [draftName, setDraftName] = useState('');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>GigBox</Text>
        <Text style={styles.subtitle}>Your entire setlist, just the cues you need.</Text>
        <View style={styles.libraryActions}>
          <Pressable style={styles.libraryAction} onPress={onExportLibrary}>
            <Text style={styles.actionText}>Export JSON</Text>
          </Pressable>
          <Pressable style={styles.libraryAction} onPress={onImportLibrary}>
            <Text style={styles.actionText}>Import JSON</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.createRow}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="New setlist name"
          placeholderTextColor={theme.colors.text_secondary}
          style={styles.input}
        />
        <Button title="Add" onPress={() => {
          if (draftName.trim()) {
            onCreateSetlist(draftName);
            setDraftName('');
          }
        }} />
      </View>

      <NestableScrollContainer contentContainerStyle={styles.list}>
        {setlists.length === 0 ? (
          <Text style={styles.emptyState}>No setlists yet. Create one to begin.</Text>
        ) : (
          setlists.map((setlist) => (
            <View key={setlist.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.setlistName}>{setlist.name}</Text>
                <Pressable style={styles.addSongButton} onPress={() => onOpenNewSong(setlist.id)}>
                  <Text style={styles.addSongText}>+ Song</Text>
                </Pressable>
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
                          <Pressable style={styles.actionButton} onPress={() => onOpenSongForEdit(setlist.id, song)}>
                            <Text style={styles.actionText}>Edit</Text>
                          </Pressable>
                          <Pressable style={styles.primaryActionButton} onPress={() => onOpenPerformance(song)}>
                            <Text style={styles.primaryActionText}>Play</Text>
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
    marginBottom: 14,
  },
  title: {
    color: theme.colors.text_primary,
    fontSize: theme.typography.headline_size,
    fontWeight: theme.typography.font_weight_bold,
  },
  subtitle: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginTop: 4,
  },
  libraryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  libraryAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  createRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.colors.surface_card,
    color: theme.colors.text_primary,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  list: {
    paddingBottom: 24,
    gap: 14,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setlistName: {
    color: theme.colors.text_primary,
    fontSize: 20,
    fontWeight: theme.typography.font_weight_bold,
  },
  addSongButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.accent_highlight,
  },
  addSongText: {
    color: theme.colors.background,
    fontWeight: theme.typography.font_weight_bold,
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
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  actionText: {
    color: theme.colors.text_primary,
  },
  primaryActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.box_active_state,
  },
  primaryActionText: {
    color: theme.colors.text_primary,
    fontWeight: theme.typography.font_weight_bold,
  },
});
