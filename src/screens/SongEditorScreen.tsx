import React, { useMemo, useState } from 'react';
import {
  Button,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '../theme';
import type { Song } from '../types';

type SongEditorScreenProps = {
  setlistId: string;
  initialSong?: Song;
  onCancel: () => void;
  onSave: (payload: { title: string; notesRawText: string }) => void;
  onPlay: (song: Song) => void;
};

export default function SongEditorScreen({
  setlistId,
  initialSong,
  onCancel,
  onSave,
  onPlay,
}: SongEditorScreenProps) {
  const [title, setTitle] = useState(initialSong?.title ?? '');
  const [notes, setNotes] = useState(initialSong?.notes_raw_text ?? '');

  const currentSong = useMemo(
    () => ({
      id: initialSong?.id ?? 'new-song',
      title: title.trim() || 'Untitled Song',
      notes_raw_text: notes,
    }),
    [notes, title, initialSong],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.subtle}>Setlist ID: {setlistId}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Song title"
          placeholderTextColor={theme.colors.text_secondary}
          style={styles.input}
        />

        <Text style={styles.label}>Notes / Cues</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Type cue lines, one per line"
          placeholderTextColor={theme.colors.text_secondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.textArea]}
        />

        <View style={styles.actions}>
          <Button title="Cancel" onPress={onCancel} color={theme.colors.text_secondary} />
          <Button
            title="Save"
            onPress={() => {
              onSave({ title, notesRawText: notes });
            }}
          />
        </View>

        <Pressable
          style={styles.playButton}
          onPress={() => onPlay(currentSong)}
        >
          <Text style={styles.playButtonText}>Launch performance view</Text>
        </Pressable>
      </ScrollView>
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
    marginBottom: 16,
  },
  subtle: {
    color: theme.colors.text_secondary,
    marginTop: 6,
  },
  content: {
    paddingBottom: 30,
  },
  label: {
    color: theme.colors.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface_card,
    color: theme.colors.text_primary,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 18,
    minHeight: 48,
  },
  textArea: {
    minHeight: 220,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  playButton: {
    marginTop: 20,
    backgroundColor: theme.colors.accent_highlight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.font_weight_bold,
  },
});
