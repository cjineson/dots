import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createCueDocumentFromText,
  CUE_COLORS,
  TAG_COLORS,
  flattenCueDocument,
  getVisibleCueBlocks,
  parseCueDocument,
  serializeCueDocument,
} from '../lib/cueDocument';
import PerformanceCueContent from '../components/PerformanceCueContent';
import SongTagsView from '../components/SongTags';
import { makeId } from '../lib/uuid';
import { undoAutoPeriod } from '../lib/autoPeriod';
import { deriveNoteTitle } from '../lib/noteTitle';
import { useUnsavedChangesPrompt } from '../lib/useUnsavedChangesPrompt';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { CueBlock, CueDocument, CueTextColor, Song, SongTag, TagColor } from '../types';

type SongEditorScreenProps = {
  initialSong?: Song;
  isNote?: boolean;
  commonTags: SongTag[];
  onCancel: () => void;
  onSave: (payload: {
    title: string;
    notesRawText: string;
    cueDocument: string;
    tags: SongTag[];
    fontSize?: number;
  }) => void;
  onPlay: (song: Song) => void;
};

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 64;
const FONT_SIZE_STEP = 2;

export default function SongEditorScreen({
  initialSong,
  isNote = false,
  commonTags,
  onCancel,
  onSave,
  onPlay,
}: SongEditorScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState(initialSong?.title_derived ? '' : initialSong?.title ?? '');
  const [document, setDocument] = useState<CueDocument>(() =>
    initialSong?.cue_document
      ? parseCueDocument(initialSong.cue_document)
      : createCueDocumentFromText(initialSong?.notes_raw_text ?? ''),
  );
  const [tags, setTags] = useState<SongTag[]>(() => initialSong?.tags ?? []);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState<TagColor>(TAG_COLORS[1]);

  const currentSong = useMemo(() => {
    const notesRawText = flattenCueDocument(document);
    return {
      id: initialSong?.id ?? 'new-song',
      title: title.trim() || (isNote ? deriveNoteTitle(notesRawText) : 'Untitled Song'),
      ...(isNote && !title.trim() ? { title_derived: true } : {}),
      notes_raw_text: notesRawText,
      cue_document: serializeCueDocument(document),
      font_size: initialSong?.font_size ?? theme.typography.box_text_size,
      tags,
      ...(isNote ? { is_note: true } : {}),
    };
  }, [document, tags, title, initialSong, isNote]);
  const savePayload = () => ({
    title,
    notesRawText: currentSong.notes_raw_text,
    cueDocument: currentSong.cue_document,
    tags: currentSong.tags ?? [],
    fontSize: currentSong.font_size,
  });
  const { runSave } = useUnsavedChangesPrompt({
    snapshot: JSON.stringify([title, currentSong.cue_document, tags]),
    save: () => runSave(() => onSave(savePayload())),
  });
  const previewCueBlocks = useMemo(() => getVisibleCueBlocks(document), [document]);
  const availableCommonTags = commonTags.filter(
    (tag) => !tags.some(
      (current) => current.label.toLocaleLowerCase() === tag.label.toLocaleLowerCase(),
    ),
  );

  const addTag = () => {
    const label = tagName.trim();
    if (!label) {
      return;
    }
    setTags((current) => {
      const existingIndex = current.findIndex(
        (tag) => tag.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
      );
      if (existingIndex < 0) {
        return [...current, { label, color: tagColor }];
      }
      return current.map((tag, index) =>
        index === existingIndex ? { ...tag, color: tagColor } : tag,
      );
    });
    setTagName('');
  };

  const addCommonTag = (tag: SongTag) => {
    setTags((current) => [...current, tag]);
  };

  const updateBlock = (blockId: string, update: (block: CueBlock) => CueBlock) => {
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? update(block) : block)),
    }));
  };

  const addTextBlock = (type: 'text' | 'section') => {
    setDocument((current) => ({
      ...current,
      blocks: [...current.blocks, { id: makeId(), type, text: '' }],
    }));
  };

  const addTable = () => {
    setDocument((current) => ({
      ...current,
      blocks: [...current.blocks, { id: makeId(), type: 'table', rows: [['', ''], ['', '']] }],
    }));
  };

  const updateFontSize = (block: CueBlock, delta: number) => {
    const fontSize = Math.max(
      MIN_FONT_SIZE,
      Math.min(MAX_FONT_SIZE, (block.font_size ?? theme.typography.box_text_size) + delta),
    );
    updateBlock(block.id, (current) => ({ ...current, font_size: fontSize }));
  };

  const updateColor = (block: CueBlock, color: CueTextColor) => {
    updateBlock(block.id, (current) => ({ ...current, color }));
  };

  const renderStyleControls = (block: CueBlock) => (
    <View style={styles.styleControls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease block text size"
        onPress={() => updateFontSize(block, -FONT_SIZE_STEP)}
        style={styles.styleButton}
      >
        <MaterialCommunityIcons name="format-font-size-decrease" size={20} color={theme.colors.text_primary} />
      </Pressable>
      <Text style={styles.fontSizeValue}>{block.font_size ?? theme.typography.box_text_size}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase block text size"
        onPress={() => updateFontSize(block, FONT_SIZE_STEP)}
        style={styles.styleButton}
      >
        <MaterialCommunityIcons name="format-font-size-increase" size={20} color={theme.colors.text_primary} />
      </Pressable>
      <View style={styles.colorOptions}>
        {CUE_COLORS.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Set block color ${color}`}
            onPress={() => updateColor(block, color)}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              (block.color ?? '#FFFFFF') === color && styles.selectedColorSwatch,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const updateTableCell = (block: CueBlock, rowIndex: number, columnIndex: number, value: string) => {
    if (block.type !== 'table') return;
    updateBlock(block.id, (current) =>
      current.type === 'table'
        ? {
            ...current,
            rows: current.rows.map((row, currentRowIndex) =>
              currentRowIndex === rowIndex
                ? row.map((cell, currentColumnIndex) =>
                    currentColumnIndex === columnIndex ? value : cell,
                  )
                : row,
            ),
          }
        : current,
    );
  };

  const renderBlock = (block: CueBlock, index: number) => (
    <View key={block.id} style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockType}>
          {block.type === 'section' ? 'HEADING' : block.type === 'table' ? 'TABLE' : 'SONG TEXT'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${block.type} block ${index + 1}`}
          onPress={() =>
            setDocument((current) => ({
              ...current,
              blocks: current.blocks.filter((item) => item.id !== block.id),
            }))
          }
          style={styles.removeButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.text_secondary} />
        </Pressable>
      </View>

      {block.type === 'table' ? (
        <View style={styles.table}>
          {block.rows.map((row, rowIndex) => (
            <View key={`${block.id}-row-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, columnIndex) => (
                <TextInput
                  key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                  value={cell}
                  onChangeText={(value) =>
                    updateTableCell(block, rowIndex, columnIndex, undoAutoPeriod(cell, value))
                  }
                  placeholder={rowIndex === 0 ? `Column ${columnIndex + 1}` : 'Cue'}
                  placeholderTextColor={theme.colors.text_secondary}
                  multiline
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="none"
                  textAlignVertical="top"
                  style={[
                    styles.tableCell,
                    {
                      color: block.color ?? theme.colors.text_primary,
                      fontSize: block.font_size ?? theme.typography.box_text_size,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add table row"
            onPress={() =>
              updateBlock(block.id, (current) =>
                current.type === 'table'
                  ? { ...current, rows: [...current.rows, current.rows[0].map(() => '')] }
                  : current,
              )
            }
            style={styles.addRowButton}
          >
            <Text style={styles.addRowText}>+ Row</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add table column"
            onPress={() =>
              updateBlock(block.id, (current) =>
                current.type === 'table'
                  ? { ...current, rows: current.rows.map((row) => [...row, '']) }
                  : current,
              )
            }
            style={styles.addRowButton}
          >
            <Text style={styles.addRowText}>+ Column</Text>
          </Pressable>
        </View>
      ) : (
        <TextInput
          value={block.text}
          onChangeText={(text) =>
            updateBlock(block.id, (current) =>
              current.type === 'text' || current.type === 'section'
                ? { ...current, text: undoAutoPeriod(current.text, text) }
                : current,
            )
          }
          placeholder={
            block.type === 'section'
              ? 'Heading (e.g. Verse, Solo)'
              : 'Paste or type lyrics, chords or guitar tabs'
          }
          placeholderTextColor={theme.colors.text_secondary}
          multiline={block.type === 'text'}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          textAlignVertical="top"
          style={[
            styles.input,
            block.type === 'text' && styles.textArea,
            block.type === 'section' && styles.sectionInput,
            { color: block.color ?? theme.colors.text_primary },
          ]}
        />
      )}

      {renderStyleControls(block)}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={isNote ? 'Note title (optional)' : 'Song title'}
          placeholderTextColor={theme.colors.text_secondary}
          style={styles.input}
        />
        {isNote && (
          <Text style={styles.helperText}>
            Optional. Without a title the note is named after its first line, and that name is hidden in the dashboard, Flow and performance headers.
          </Text>
        )}

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagEditor}>
          <View style={styles.tagInputRow}>
            <TextInput
              value={tagName}
              onChangeText={setTagName}
              onSubmitEditing={addTag}
              returnKeyType="done"
              placeholder="Tag name (e.g. Acoustic, Electric, Piano, Capo 5)"
              placeholderTextColor={theme.colors.text_secondary}
              style={[styles.input, styles.tagInput]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add song tag"
              disabled={!tagName.trim()}
              onPress={addTag}
              style={[styles.addTagButton, !tagName.trim() && styles.disabledTagButton]}
            >
              <MaterialCommunityIcons name="plus" size={22} color={theme.colors.accent_highlight} />
            </Pressable>
          </View>
          <View style={styles.tagColorOptions}>
            {TAG_COLORS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityLabel={`Choose tag color ${color}`}
                accessibilityState={{ selected: tagColor === color }}
                onPress={() => setTagColor(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  tagColor === color && styles.selectedColorSwatch,
                ]}
              />
            ))}
          </View>
          {availableCommonTags.length > 0 && (
            <View style={styles.commonTags}>
              <Text style={styles.commonTagsLabel}>Common tags</Text>
              <View style={styles.commonTagOptions}>
                {availableCommonTags.map((tag) => (
                  <Pressable
                    key={tag.label.toLocaleLowerCase()}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${tag.label} tag`}
                    onPress={() => addCommonTag(tag)}
                    style={[styles.commonTagButton, { borderColor: tag.color }]}
                  >
                    <MaterialCommunityIcons name="plus" size={14} color={tag.color} />
                    <Text style={[styles.commonTagText, { color: tag.color }]}>{tag.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View style={styles.editableTags}>
            {tags.map((tag, index) => (
              <Pressable
                key={`${tag.label}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${tag.label} tag`}
                onPress={() => setTags((current) => current.filter((_, i) => i !== index))}
                style={[styles.editableTag, { borderColor: tag.color }]}
              >
                <Text style={[styles.editableTagText, { color: tag.color }]}>{tag.label}</Text>
                <MaterialCommunityIcons name="close" size={15} color={tag.color} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.cueHeading}>
          <Text style={styles.label}>{isNote ? 'Note text' : 'Song text'}</Text>
          <Text style={styles.helperText}>
            {isNote
              ? 'Reminders, announcements or chat prompts. This is what you see on stage.'
              : 'Paste or type your lyrics, chords or guitar tabs. This is what you see on stage.'}
          </Text>
        </View>

        {document.blocks.map(renderBlock)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add song text"
          onPress={() => addTextBlock('text')}
          style={styles.addTextButton}
        >
          <MaterialCommunityIcons name="plus" size={20} color={theme.colors.text_primary} />
          <Text style={styles.addTextButtonText}>Add more text</Text>
        </Pressable>
        <View style={styles.optionalActions}>
          <Text style={styles.optionalLabel}>Optional</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add heading"
            onPress={() => addTextBlock('section')}
            style={styles.optionalButton}
          >
            <Text style={styles.optionalButtonText}>+ Heading</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add table"
            onPress={addTable}
            style={styles.optionalButton}
          >
            <Text style={styles.optionalButtonText}>+ Table</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Performance preview</Text>
        <View style={styles.previewHeading}>
          <Text numberOfLines={2} style={styles.previewSongTitle}>{currentSong.title}</Text>
          <SongTagsView tags={tags} />
        </View>
        <View style={styles.previewCueBox}>
          {previewCueBlocks.length > 0 ? (
            <ScrollView
              nestedScrollEnabled
              contentContainerStyle={styles.previewCueContent}
            >
              <PerformanceCueContent blocks={previewCueBlocks} />
            </ScrollView>
          ) : (
            <Text style={styles.previewEmpty}>Add some text to preview it.</Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview performance view"
          onPress={() => onPlay(currentSong)}
          style={styles.previewButton}
        >
          <MaterialCommunityIcons name="eye-outline" size={20} color={theme.colors.text_primary} />
          <Text style={styles.previewButtonText}>Preview performance view</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => runSave(() => onSave(savePayload()))}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  content: {
    paddingBottom: 12,
  },
  label: {
    color: theme.colors.text_primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cueHeading: {
    marginTop: 4,
  },
  tagEditor: {
    marginTop: -4,
    marginBottom: 12,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    marginBottom: 0,
  },
  addTagButton: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface_card,
  },
  disabledTagButton: {
    opacity: 0.4,
  },
  tagColorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  commonTags: {
    marginBottom: 8,
  },
  commonTagsLabel: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  commonTagOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  commonTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  commonTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editableTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  editableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editableTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    color: theme.colors.text_secondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.surface_card,
    color: theme.colors.text_primary,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  textArea: {
    minHeight: 90,
  },
  sectionInput: {
    fontWeight: '700',
  },
  blockCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockType: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
  styleButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeValue: {
    color: theme.colors.text_secondary,
    minWidth: 20,
    textAlign: 'center',
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  selectedColorSwatch: {
    borderWidth: 3,
    borderColor: theme.colors.text_primary,
  },
  table: {
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    color: theme.colors.text_primary,
    backgroundColor: theme.colors.surface_card,
  },
  addRowButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  addRowText: {
    color: theme.colors.accent_highlight,
    fontWeight: '600',
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent_highlight,
  },
  addTextButtonText: {
    color: theme.colors.text_primary,
    fontSize: 15,
    fontWeight: '700',
  },
  optionalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  optionalLabel: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  optionalButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  optionalButtonText: {
    color: theme.colors.text_secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  previewHeading: {
    gap: 8,
    marginBottom: 8,
  },
  previewSongTitle: {
    color: theme.colors.text_primary,
    fontSize: 18,
    fontWeight: theme.typography.font_weight_bold,
  },
  previewCueBox: {
    minHeight: 240,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 2,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
  },
  previewCueContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  previewEmpty: {
    color: theme.colors.text_secondary,
    textAlign: 'center',
    marginVertical: 72,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    marginBottom: 12,
  },
  previewButtonText: {
    color: theme.colors.text_primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.background,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.surface,
  },
  cancelButtonText: {
    color: theme.colors.text_primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.accent_highlight,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: theme.typography.font_weight_bold,
  },
});
