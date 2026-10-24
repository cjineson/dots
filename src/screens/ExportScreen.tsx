import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EMPTY_SELECTION,
  countSelection,
  isSetlistSelected,
  isSongSelected,
  toggleGroupSelection,
  toggleSetlistSelection,
  toggleSongSelection,
} from '../lib/archiveSelection';
import type { ExportSelection } from '../lib/archiveSelection';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { SetlistGroup, SetlistWithSongs } from '../types';

type Props = {
  setlists: SetlistWithSongs[];
  groups: SetlistGroup[];
  onExport: (selection: ExportSelection) => void;
};

export default function ExportScreen({ setlists, groups, onExport }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selection, setSelection] = useState<ExportSelection>(EMPTY_SELECTION);
  const [expanded, setExpanded] = useState<Record<string, true>>({});
  const total = countSelection(selection);
  const allSelected =
    groups.every((group) => selection.groupIds.has(group.id)) &&
    setlists.every((setlist) => isSetlistSelected(selection, setlist));

  const renderCheck = (checked: boolean) => (
    <MaterialCommunityIcons
      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={26}
      color={checked ? theme.colors.accent_highlight : theme.colors.text_secondary}
    />
  );

  const toggleExpanded = (setlistId: string) =>
    setExpanded((current) => {
      const next = { ...current };
      if (next[setlistId]) {
        delete next[setlistId];
      } else {
        next[setlistId] = true;
      }
      return next;
    });

  const renderSetlist = (setlist: SetlistWithSongs) => {
    const open = expanded[setlist.id] === true;
    const checked = isSetlistSelected(selection, setlist);
    return (
      <View key={setlist.id}>
        <View style={[styles.row, styles.setlistRow]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Export setlist ${setlist.name}`}
            accessibilityState={{ checked }}
            onPress={() => setSelection(toggleSetlistSelection(selection, setlist, setlists))}
            style={styles.rowMain}
          >
            {renderCheck(checked)}
            <Text style={styles.rowText}>{setlist.name}</Text>
            <Text style={styles.count}>{setlist.songs.length} songs</Text>
          </Pressable>
          {setlist.songs.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={open ? `Hide songs in ${setlist.name}` : `Show songs in ${setlist.name}`}
              onPress={() => toggleExpanded(setlist.id)}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={26}
                color={theme.colors.text_secondary}
              />
            </Pressable>
          )}
        </View>
        {open &&
          setlist.songs.map((song) => {
            const songChecked = isSongSelected(selection, setlist, song.id);
            return (
              <Pressable
                key={song.id}
                accessibilityRole="checkbox"
                accessibilityLabel={`Export song ${song.title}`}
                accessibilityState={{ checked: songChecked }}
                onPress={() =>
                  setSelection(toggleSongSelection(selection, setlist, song.id, setlists))
                }
                style={[styles.row, styles.songRow]}
              >
                {renderCheck(songChecked)}
                <Text style={styles.rowText}>{song.title}</Text>
              </Pressable>
            );
          })}
      </View>
    );
  };

  const ungrouped = setlists.filter((setlist) => !setlist.group_id);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Choose groups, setlists or individual songs. Picking only some songs of a setlist exports
          just those songs.
        </Text>
        {groups.map((group) => (
          <View key={group.id}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Export group ${group.name}`}
              accessibilityState={{ checked: selection.groupIds.has(group.id) }}
              onPress={() => setSelection(toggleGroupSelection(selection, group, setlists))}
              style={[styles.row, styles.groupRow]}
            >
              {renderCheck(selection.groupIds.has(group.id))}
              <Text style={[styles.rowText, styles.groupText]}>{group.name}</Text>
            </Pressable>
            {setlists.filter((setlist) => setlist.group_id === group.id).map(renderSetlist)}
          </View>
        ))}
        {ungrouped.length > 0 && groups.length > 0 && (
          <Text style={styles.sectionTitle}>No group</Text>
        )}
        {ungrouped.map(renderSetlist)}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allSelected ? 'Select none' : 'Select all'}
          onPress={() =>
            setSelection(
              allSelected
                ? EMPTY_SELECTION
                : {
                    groupIds: new Set(groups.map((group) => group.id)),
                    setlistIds: new Set(setlists.map((setlist) => setlist.id)),
                    songIds: new Set(),
                  },
            )
          }
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>{allSelected ? 'Select none' : 'Select all'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export selected"
          accessibilityState={{ disabled: total === 0 }}
          disabled={total === 0}
          onPress={() => onExport(selection)}
          style={[styles.primaryButton, total === 0 && styles.disabled]}
        >
          <Text style={styles.primaryText}>Export selected</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 6 },
  hint: { color: theme.colors.text_secondary, fontSize: 13, marginBottom: 8 },
  sectionTitle: {
    marginTop: 12,
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  groupRow: { marginTop: 8, backgroundColor: theme.colors.surface_card },
  setlistRow: { marginTop: 4, marginLeft: 12 },
  songRow: { marginTop: 4, marginLeft: 32 },
  rowText: { flex: 1, color: theme.colors.text_primary, fontSize: 16 },
  groupText: { fontWeight: '700' },
  count: { color: theme.colors.text_secondary, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.action_primary,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
  },
  secondaryText: { color: theme.colors.text_primary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
