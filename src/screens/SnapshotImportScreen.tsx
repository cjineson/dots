import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseCueDocument } from '../lib/cueDocument';
import {
  copyLibrarySnapshot, getSnapshotConflicts, mapSnapshotMatches, mergeLibrarySnapshots,
  snapshotConflictKey, suggestSnapshotMatches,
} from '../lib/librarySnapshot';
import type { LibrarySnapshot, SnapshotChoices, SnapshotConflict, SnapshotMatch } from '../lib/librarySnapshot';
import { parseStoredSongTags } from '../lib/songTags';
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

function label(record: SnapshotConflict['local']): string {
  return 'name' in record ? record.name : record.title || '(untitled note)';
}

function describe(record: SnapshotConflict['local'], library: LibrarySnapshot): string {
  if ('notes_raw_text' in record) {
    const tags = parseStoredSongTags(record.tags).map((tag) => `${tag.label} (${tag.color})`).join(', ') || 'None';
    const cue = record.cue_document ? parseCueDocument(record.cue_document).blocks.map((block) => {
      const style = [block.color && `colour ${block.color}`, block.font_size && `size ${block.font_size}`].filter(Boolean).join(', ');
      const text = block.type === 'table' ? block.rows.map((row) => row.join(' | ')).join('\n') : block.text;
      return `${block.type}${style ? ` (${style})` : ''}:\n${text}`;
    }).join('\n\n') : 'None';
    const group = library.groups.find(({ id }) => id === record.group_id)?.name ?? 'None';
    return `Title: ${record.title || '(untitled)'}\nType: ${record.is_note ? 'Note' : 'Song'}\nGroup: ${group}\nOrder: ${record.sort_order ?? 'Not set'}\nText size: ${record.font_size}\nTags: ${tags}\n\nPlain text:\n${record.notes_raw_text || '(empty)'}\n\nCues:\n${cue}`;
  }
  if ('items' in record) {
    const group = library.groups.find(({ id }) => id === record.group_id)?.name ?? 'None';
    const items = record.items.map((item) => item.kind === 'song'
      ? library.songs.find((song) => song.id === item.id)?.title || '(untitled note)'
      : `Break${item.duration_minutes ? ` (${item.duration_minutes} min)` : ''}`).join('\n') || '(empty)';
    return `Name: ${record.name}\nGroup: ${group}\nOrder: ${record.order_index}\nLocation: ${record.location || 'None'}\nCoordinates: ${record.latitude ?? 'None'}, ${record.longitude ?? 'None'}\nDate: ${record.date || 'None'}\nTime: ${record.time || 'None'}\nNotes: ${record.notes || 'None'}\n\nItems:\n${items}`;
  }
  return `Name: ${record.name}\nOrder: ${record.order_index}\nDescription: ${('description' in record ? record.description : undefined) || 'None'}\nImage: ${('image' in record ? record.image : undefined) ? 'Yes' : 'None'}`;
}

export default function SnapshotImportScreen({ local, incoming, onCancel, onBackup, onApply }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const suggestions = useMemo(() => suggestSnapshotMatches(local, incoming), [local, incoming]);
  const [matchChoices, setMatchChoices] = useState<Record<string, 'match' | 'separate'>>({});
  const [choices, setChoices] = useState<SnapshotChoices>({});
  const [phase, setPhase] = useState<'overview' | 'matches' | 'differences'>('overview');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<{ title: string; message: string; snapshot: LibrarySnapshot; second: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // Track which group fields were originally in the incoming snapshot (to detect omitted vs empty)
  const incomingGroupFields = useMemo(() => {
    const fields = new Map<string, Set<'description' | 'image'>>();
    for (const group of incoming.groups) {
      const set = new Set<'description' | 'image'>();
      if ('description' in group) set.add('description');
      if ('image' in group) set.add('image');
      fields.set(group.id, set);
    }
    return fields;
  }, [incoming.groups]);

  const keyForMatch = (match: SnapshotMatch) => snapshotConflictKey(match.kind, match.incoming.id);
  const mapped = useMemo(() => mapSnapshotMatches(local, incoming,
    suggestions.filter((match) => matchChoices[keyForMatch(match)] === 'match')),
  [local, incoming, suggestions, matchChoices]);
  const conflicts = useMemo(() => getSnapshotConflicts(local, mapped), [local, mapped]);
  const remainingMatches = suggestions.filter((match) => !matchChoices[keyForMatch(match)]).length;
  const remainingConflicts = conflicts.filter(({ kind, id }) => !choices[snapshotConflictKey(kind, id)]).length;
  const additions = [
    ...mapped.groups.filter(({ id }) => !local.groups.some((item) => item.id === id)).map((item) => `Group: ${item.name}`),
    ...mapped.setlists.filter(({ id }) => !local.setlists.some((item) => item.id === id)).map((item) => `Setlist: ${item.name}`),
    ...mapped.songs.filter(({ id }) => !local.songs.some((item) => item.id === id)).map((item) => `${item.is_note ? 'Note' : 'Song'}: ${item.title || '(untitled)'}`),
  ];

  const confirm = (title: string, message: string, snapshot: LibrarySnapshot, second = false) => {
    setError(null);
    setPending({ title, message, snapshot, second });
  };
  const applyCopy = () => {
    try {
      const result = copyLibrarySnapshot(local, incoming, makeId);
      confirm('Add snapshot as copies?', `This keeps the current library and adds separate copies. They will not stay in sync.${result.renamed.length ? `\n\nRenamed groups:\n${result.renamed.join('\n')}` : ''}`, result.snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };
  const applyMerge = () => {
    try {
      const result = mergeLibrarySnapshots(local, mapped, choices);
      confirm('Apply merge?', `${additions.length} new items will be added. Items on only one device are kept; setlist items from both versions are retained. Shared-song changes affect every linked setlist.${result.renamed.length ? `\n\nRenamed groups:\n${result.renamed.join('\n')}` : ''}`, result.snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };
  const button = (text: string, action: () => void, options: { disabled?: boolean; secondary?: boolean } = {}) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!options.disabled || sharing }}
      disabled={options.disabled || sharing} onPress={action}
      style={[styles.button, options.secondary ? styles.secondaryButton : styles.primaryButton, (options.disabled || sharing) && styles.disabled]}>
      <Text style={options.secondary ? styles.secondaryText : styles.primaryText}>{text}</Text>
    </Pressable>
  );

  const groupImagePreview = (image: string | null | undefined) => {
    if (!image) return null;
    return (
      <View style={styles.imageBorder}>
        <Image source={{ uri: image }} style={styles.groupImagePreview} resizeMode="contain" />
      </View>
    );
  };

  const fieldStatus = (value: unknown, omitted: boolean) => {
    if (omitted) return ' (not in this snapshot version)';
    if (value === null || value === undefined || value === '') return ' (empty)';
    return '';
  };

  const details = (key: string, left: SnapshotConflict['local'], right: SnapshotConflict['incoming'], leftOmitted?: boolean, rightOmitted?: boolean) => (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expanded[key] }}
        onPress={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))} style={styles.detailsButton}>
        <MaterialCommunityIcons name={expanded[key] ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.action_primary} />
        <Text style={styles.detailsLink}>{expanded[key] ? 'Hide details' : 'Compare details'}</Text>
      </Pressable>
      {expanded[key] && (
        <View style={styles.comparison}>
          <Text style={styles.section}>This device</Text>
          <Text selectable style={styles.detailText}>{describe(left, local)}{fieldStatus(left, !!leftOmitted)}</Text>
          {'image' in left && groupImagePreview(left.image)}
          <Text style={styles.section}>Snapshot</Text>
          <Text selectable style={styles.detailText}>{describe(right, incoming)}{fieldStatus(right, !!rightOmitted)}</Text>
          {'image' in right && groupImagePreview(right.image)}
        </View>
      )}
    </>
  );
  const option = (text: string, selected: boolean, action: () => void) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }}
      onPress={action} style={[styles.option, selected && styles.selected]}>
      <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? theme.colors.accent_highlight : theme.colors.text_secondary} />
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Library snapshot</Text>
        <Text style={styles.hint}>Exported {new Date(incoming.exportedAt).toLocaleString()} · {incoming.groups.length} groups, {incoming.setlists.length} setlists, {incoming.songs.length} songs or notes</Text>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {pending ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{pending.title}</Text>
            <Text style={styles.text}>{pending.message}</Text>
            {button(pending.second ? 'Continue' : 'Confirm and apply', () => {
              if (pending.second) confirm('Really replace the library?', 'This cannot be undone without a separate backup.', pending.snapshot);
              else {
                try { onApply(pending.snapshot); }
                catch (caught) { setError(`Snapshot import failed: ${caught instanceof Error ? caught.message : String(caught)}`); }
              }
            })}
            {button('Back to preview', () => setPending(null), { secondary: true })}
          </View>
        ) : phase === 'overview' ? (
          <>
            <Text style={styles.hint}>Manual transfer, not automatic sync. Settings stay on this device. Save a separate backup before changing your library.</Text>
            {button('Export current library snapshot', () => {
              setError(null);
              setSharing(true);
              void onBackup().catch((caught: unknown) =>
                setError(`Snapshot export failed: ${caught instanceof Error ? caught.message : String(caught)}`))
                .finally(() => setSharing(false));
            }, { secondary: true })}
            {button('Preview merge', () => setPhase(suggestions.length ? 'matches' : 'differences'))}
            {button('Add as copies', applyCopy, { secondary: true })}
            {button('Replace current library', () => confirm('Replace entire library?', 'Everything in the current library that is not in this snapshot will be removed. Export a backup first. Settings stay on this device.', incoming, true), { secondary: true })}
          </>
        ) : phase === 'matches' ? (
          <>
            <Text style={styles.heading}>Possible matches</Text>
            <Text style={styles.hint}>These have similar names or identical text but different IDs. Are they the same? Compare details before choosing. Ambiguous matches are kept separate.</Text>
            {suggestions.map((match) => {
              const key = keyForMatch(match);
              const rightOmitted = match.kind === 'group' && 'description' in match.incoming ? false : match.kind === 'group' ? !incomingGroupFields.get(match.incoming.id)?.has('description') : undefined;
              return (
                <View key={key} style={styles.card}>
                  <Text style={styles.heading}>{match.kind}: {label(match.incoming)}</Text>
                  {label(match.local) !== label(match.incoming) && <Text style={styles.hint}>This device: {label(match.local)}</Text>}
                  {details(key, match.local, match.incoming, false, rightOmitted)}
                  {option('Same item', matchChoices[key] === 'match', () => {
                    setMatchChoices((current) => ({ ...current, [key]: 'match' }));
                    setChoices({});
                  })}
                  {option('Keep separate', matchChoices[key] === 'separate', () => {
                    setMatchChoices((current) => ({ ...current, [key]: 'separate' }));
                    setChoices({});
                  })}
                </View>
              );
            })}
            {button(remainingMatches ? `${remainingMatches} matches to review` : 'Review differences', () => setPhase('differences'), { disabled: remainingMatches > 0 })}
            {button('Back', () => setPhase('overview'), { secondary: true })}
          </>
        ) : (
          <>
            <Text style={styles.heading}>Review merge</Text>
            <Text style={styles.hint}>{additions.length} new items will be added. Items on only one device are kept. Setlist items from both versions are retained. Changes to a shared song affect every linked setlist.</Text>
            {additions.length > 0 && (
              <>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expanded.additions }}
                  onPress={() => setExpanded((current) => ({ ...current, additions: !current.additions }))} style={styles.detailsButton}>
                  <MaterialCommunityIcons name={expanded.additions ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.action_primary} />
                  <Text style={styles.detailsLink}>{expanded.additions ? 'Hide additions' : 'Show additions'}</Text>
                </Pressable>
                {expanded.additions && <View style={styles.card}>{additions.map((addition, index) => <Text key={index} style={styles.text}>{addition}</Text>)}</View>}
              </>
            )}
            <Text style={styles.hint}>{remainingConflicts ? `${remainingConflicts} differences to review` : 'All differences reviewed.'}</Text>
            {conflicts.map((conflict) => {
              const key = snapshotConflictKey(conflict.kind, conflict.id);
              const source = incoming[conflict.kind === 'group' ? 'groups' : conflict.kind === 'song' ? 'songs' : 'setlists']
                .find((record) => record.id === suggestions.find((match) => keyForMatch(match) in matchChoices && matchChoices[keyForMatch(match)] === 'match' && match.kind === conflict.kind && match.local.id === conflict.id)?.incoming.id);
              const incomingRecord = source ?? conflict.incoming;
              const rightOmitted = conflict.kind === 'group' && 'description' in conflict.incoming ? false : conflict.kind === 'group' ? !incomingGroupFields.get(conflict.incoming.id)?.has('description') : undefined;
              return (
                <View key={key} style={styles.card}>
                  <Text style={styles.heading}>{conflict.kind}: {label(conflict.local)}</Text>
                  {details(key, conflict.local, incomingRecord, false, rightOmitted)}
                  {option('Use this device', choices[key] === 'local', () => setChoices((current) => ({ ...current, [key]: 'local' })))}
                  {option('Use snapshot', choices[key] === 'incoming', () => setChoices((current) => ({ ...current, [key]: 'incoming' })))}
                </View>
              );
            })}
            {button('Apply merge', applyMerge, { disabled: remainingConflicts > 0 })}
            {button('Back', () => setPhase(suggestions.length ? 'matches' : 'overview'), { secondary: true })}
          </>
        )}
        {button('Cancel', onCancel, { secondary: true })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, gap: 12 },
  title: { color: theme.colors.text_primary, fontSize: 24, fontWeight: '700' },
  heading: { color: theme.colors.text_primary, fontSize: 16, fontWeight: '700' },
  text: { color: theme.colors.text_primary, fontSize: 15, lineHeight: 21, flexShrink: 1 },
  hint: { color: theme.colors.text_secondary, fontSize: 13, lineHeight: 19 },
  error: { color: theme.colors.action_danger, fontSize: 14 },
  section: { color: theme.colors.text_secondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  card: { padding: 14, gap: 8, borderRadius: 10, backgroundColor: theme.colors.surface_card },
  comparison: { gap: 6, padding: 10, borderRadius: 10, backgroundColor: theme.colors.surface },
  detailText: { color: theme.colors.text_primary, fontSize: 14, lineHeight: 20 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  detailsLink: { color: theme.colors.action_primary, fontSize: 14, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 10 },
  selected: { backgroundColor: theme.colors.box_active_state },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryButton: { backgroundColor: theme.colors.action_primary },
  secondaryButton: { backgroundColor: theme.colors.surface_card },
  primaryText: { color: theme.colors.on_accent, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryText: { color: theme.colors.text_primary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  imageBorder: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border_contrast },
  groupImagePreview: { width: '100%', height: 200 },
});
