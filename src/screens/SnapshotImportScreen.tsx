import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  copyLibrarySnapshot,
  getSnapshotConflicts,
  mergeLibrarySnapshots,
  snapshotConflictKey,
} from '../lib/librarySnapshot';
import type { LibrarySnapshot, SnapshotChoices, SnapshotConflict } from '../lib/librarySnapshot';
import { makeId } from '../lib/uuid';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';

type Props = {
  local: LibrarySnapshot;
  incoming: LibrarySnapshot;
  onCancel: () => void;
  onBackup: () => Promise<void>;
  onApply: (snapshot: LibrarySnapshot) => void;
};

function describeRecord(value: SnapshotConflict['local'], library: LibrarySnapshot): string {
  const withGroup = 'group_id' in value
    ? { ...value, group_name: library.groups.find((group) => group.id === value.group_id)?.name ?? null }
    : value;
  const described = 'items' in withGroup
    ? {
        ...withGroup,
        items: withGroup.items.map((item) => item.kind === 'song'
          ? { ...item, title: library.songs.find((song) => song.id === item.id)?.title ?? '(untitled)' }
          : item),
      }
    : withGroup;
  return JSON.stringify(described, (key, item: unknown) => {
    if ((key === 'cue_document' || key === 'tags') && typeof item === 'string') {
      return JSON.parse(item) as unknown;
    }
    return item;
  }, 2);
}

export default function SnapshotImportScreen({ local, incoming, onCancel, onBackup, onApply }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const conflicts = useMemo(() => getSnapshotConflicts(local, incoming), [local, incoming]);
  const additions = useMemo(() => {
    const groups = new Set(local.groups.map(({ id }) => id));
    const songs = new Set(local.songs.map(({ id }) => id));
    const setlists = new Set(local.setlists.map(({ id }) => id));
    return [
      ...incoming.groups.filter(({ id }) => !groups.has(id)).map(({ name }) => `Group: ${name}`),
      ...incoming.setlists.filter(({ id }) => !setlists.has(id)).map(({ name }) => `Setlist: ${name}`),
      ...incoming.songs.filter(({ id }) => !songs.has(id)).map(({ title }) => `Song or note: ${title || '(untitled)'}`),
    ];
  }, [local, incoming]);
  const [choices, setChoices] = useState<SnapshotChoices>({});
  const [mode, setMode] = useState<'overview' | 'merge'>('overview');
  const [pending, setPending] = useState<{ title: string; message: string; snapshot: LibrarySnapshot; second: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const unresolved = conflicts.filter(({ kind, id }) => !choices[snapshotConflictKey(kind, id)]).length;

  const confirm = (title: string, message: string, snapshot: LibrarySnapshot, second = false) => {
    setError(null);
    setPending({ title, message, snapshot, second });
  };
  const applyCopy = () => {
    try {
      const result = copyLibrarySnapshot(local, incoming, makeId);
      confirm('Add snapshot as copies?', `This keeps the current library and adds separate copies. They will not stay in sync.${result.renamed.length ? `\n\nRenamed groups:\n${result.renamed.join('\n')}` : ''}`, result.snapshot);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  const applyMerge = () => {
    try {
      const result = mergeLibrarySnapshots(local, incoming, choices);
      confirm('Apply merge?', `This adds incoming items and applies your choices. Items only on this device are kept; setlist items found on either device are retained. Shared-song changes affect every linked setlist.${result.renamed.length ? `\n\nRenamed groups:\n${result.renamed.join('\n')}` : ''}`, result.snapshot);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || sharing }} disabled={disabled || sharing}
      style={[styles.button, (disabled || sharing) && styles.disabled]} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Library snapshot</Text>
        <Text style={styles.text}>Exported {new Date(incoming.exportedAt).toLocaleString()}</Text>
        <Text style={styles.text}>{incoming.groups.length} groups, {incoming.setlists.length} setlists, {incoming.songs.length} songs or notes.</Text>
        <Text style={styles.text}>This is a manual transfer, not automatic sync. Settings stay on this device. Save a separate backup before changing your library.</Text>
        {button('Export current library snapshot', () => {
          setError(null);
          setSharing(true);
          void onBackup().catch((error: unknown) =>
            setError(`Snapshot export failed: ${error instanceof Error ? error.message : String(error)}`))
            .finally(() => setSharing(false));
        })}
        {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
        {pending ? (
          <>
            <Text style={styles.heading}>{pending.title}</Text>
            <Text style={styles.text}>{pending.message}</Text>
            {button(pending.second ? 'Continue' : 'Confirm and apply', () => {
              if (pending.second) {
                confirm('Really replace the library?', 'This cannot be undone without a separate backup.', pending.snapshot);
              } else {
                try {
                  onApply(pending.snapshot);
                } catch (error) {
                  setError(`Snapshot import failed: ${error instanceof Error ? error.message : String(error)}`);
                }
              }
            })}
            {button('Back to preview', () => setPending(null))}
          </>
        ) : mode === 'overview' ? (
          <>
            {button('Replace current library', () => confirm('Replace entire library?', 'Everything in the current library that is not in this snapshot will be removed. Export a backup first. Settings stay on this device.', incoming, true))}
            {button('Add as copies', applyCopy)}
            {button(`Preview merge (${conflicts.length} differences)`, () => setMode('merge'))}
          </>
        ) : (
          <>
            <Text style={styles.text}>Matching uses stable IDs, not names. Choose a version for each changed record. Incoming-only items are added; local-only items are kept. Setlist items from both versions are retained. Changes to a shared song affect every setlist using it.</Text>
            <Text style={styles.heading}>Items to add ({additions.length})</Text>
            {additions.map((addition, index) => <Text key={`${addition}:${index}`} style={styles.text}>{addition}</Text>)}
            <Text style={styles.text}>{unresolved} choices remaining. Names that collide will be shown before applying.</Text>
            {conflicts.map((conflict) => {
              const key = snapshotConflictKey(conflict.kind, conflict.id);
              return (
                <View key={key} style={styles.conflict}>
                  <Text style={styles.heading}>{conflict.kind}: {'name' in conflict.local ? conflict.local.name : conflict.local.title || '(untitled)'}</Text>
                  {(['local', 'incoming'] as const).map((side) => (
                    <View key={side}>
                      <Pressable accessibilityRole="radio" accessibilityState={{ checked: choices[key] === side }}
                        onPress={() => setChoices((current) => ({ ...current, [key]: side }))} style={styles.choice}>
                        <Text style={styles.text}>{choices[key] === side ? '●' : '○'} Use {side === 'local' ? 'this device' : 'snapshot'}</Text>
                      </Pressable>
                      <Text selectable style={styles.details}>{describeRecord(conflict[side], side === 'local' ? local : incoming)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            {button('Apply merge', applyMerge, unresolved > 0)}
            {button('Back to options', () => setMode('overview'))}
          </>
        )}
        {button('Cancel', onCancel)}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, gap: 14 },
  title: { color: theme.colors.text_primary, fontSize: 24, fontWeight: '700' },
  heading: { color: theme.colors.text_primary, fontSize: 18, fontWeight: '700' },
  text: { color: theme.colors.text_primary, fontSize: 16 },
  details: { color: theme.colors.text_secondary, fontSize: 13 },
  conflict: { padding: 12, gap: 10, borderWidth: 1, borderColor: theme.colors.border_contrast },
  choice: { paddingVertical: 10 },
  button: { padding: 14, borderRadius: 6, backgroundColor: theme.colors.action_primary },
  buttonText: { color: theme.colors.on_accent, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.4 },
});
