import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import { searchSongEntries } from '../lib/songSearch';
import type { SongSearchEntry } from '../lib/songSearch';

type SongSearchPanelProps = {
  entries: SongSearchEntry[];
  onSelect: (entry: SongSearchEntry) => void;
  onClose: () => void;
};

export default function SongSearchPanel({ entries, onSelect, onClose }: SongSearchPanelProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchSongEntries(entries, query), [entries, query]);

  return (
    <View style={styles.panel}>
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.text_secondary} />
        <TextInput
          accessibilityLabel="Search songs"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs"
          placeholderTextColor={theme.colors.text_secondary}
          returnKeyType="search"
          onBlur={() => {
            if (!query.trim()) {
              onClose();
            }
          }}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close search"
          onPress={onClose}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={22} color={theme.colors.text_secondary} />
        </Pressable>
      </View>
      {query.trim() !== '' && (
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.length === 0 ? (
            <Text style={styles.empty}>No matching songs.</Text>
          ) : (
            results.map((entry) => (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityLabel={`${entry.song.title}, in ${entry.location}`}
                onPress={() => onSelect(entry)}
                style={styles.result}
              >
                <Text numberOfLines={1} style={styles.resultTitle}>{entry.song.title}</Text>
                <Text numberOfLines={1} style={styles.resultLocation}>{entry.location}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  panel: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  input: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 16,
    paddingVertical: 8,
  },
  results: {
    maxHeight: 240,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
  },
  result: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultTitle: {
    flex: 1,
    color: theme.colors.text_primary,
    fontSize: 16,
  },
  resultLocation: {
    color: theme.colors.text_secondary,
    fontSize: 13,
    maxWidth: '45%',
  },
  empty: {
    padding: 12,
    color: theme.colors.text_secondary,
  },
});
