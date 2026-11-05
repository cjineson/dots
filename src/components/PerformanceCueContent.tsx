import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../themeContext';
import { undoAutoPeriod } from '../lib/autoPeriod';
import type { AppTheme } from '../theme';
import type { CueBlock } from '../types';

type PerformanceCueContentProps = {
  blocks: CueBlock[];
  fontScale?: number;
  editable?: boolean;
  onTextChange?: (blockId: string, text: string) => void;
  onTableCellChange?: (
    blockId: string,
    rowIndex: number,
    columnIndex: number,
    value: string,
  ) => void;
};

const MIN_FONT_SIZE = 10;

export default function PerformanceCueContent({
  blocks,
  fontScale = 1,
  editable = false,
  onTextChange,
  onTableCellChange,
}: PerformanceCueContentProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <>
      {blocks.map((block) => {
        const fontSize = Math.max(
          MIN_FONT_SIZE,
          (block.font_size ?? theme.typography.box_text_size) * fontScale,
        );
        const color =
          !block.color || block.color === '#FFFFFF' ? theme.colors.text_primary
            : block.color;

        if (block.type === 'table') {
          return (
            <View key={block.id} style={styles.performanceTable}>
              {block.rows.map((row, rowIndex) => (
                <View key={`${block.id}-row-${rowIndex}`} style={styles.performanceTableRow}>
                  {row.map((cell, columnIndex) =>
                    editable && onTableCellChange ? (
                      <TextInput
                        key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                        accessibilityLabel={`Edit table cell ${rowIndex + 1}, ${columnIndex + 1}`}
                        value={cell}
                        onChangeText={(value) =>
                          onTableCellChange(block.id, rowIndex, columnIndex, undoAutoPeriod(cell, value))
                        }
                        multiline
                        autoCorrect={false}
                        spellCheck={false}
                        autoCapitalize="none"
                        textAlign="center"
                        textAlignVertical="center"
                        style={[
                          styles.performanceTableCell,
                          styles.editableCueInput,
                          { color, fontSize },
                        ]}
                      />
                    ) : (
                      <Text
                        key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                        style={[styles.performanceTableCell, { color, fontSize }]}
                      >
                        {cell}
                      </Text>
                    ),
                  )}
                </View>
              ))}
            </View>
          );
        }

        const textStyle = [
          styles.cueText,
          block.type === 'section' && styles.sectionText,
          {
            color,
            fontSize,
            marginBottom: block.type === 'section' ? 12 : 4,
          },
        ];

        return editable && onTextChange ? (
          <TextInput
            key={block.id}
            accessibilityLabel={`Edit ${block.type} cue`}
            value={block.text}
            onChangeText={(text) => onTextChange(block.id, undoAutoPeriod(block.text, text))}
            multiline
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            textAlign="center"
            textAlignVertical="center"
            style={[textStyle, styles.editableCueInput]}
          />
        ) : (
          <Text key={block.id} style={textStyle}>
            {block.text}
          </Text>
        );
      })}
    </>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  cueText: {
    color: theme.colors.text_primary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  sectionText: {
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border_contrast,
    paddingBottom: 4,
  },
  performanceTable: {
    width: '100%',
    marginVertical: 6,
  },
  performanceTableRow: {
    flexDirection: 'row',
  },
  performanceTableCell: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    padding: 6,
  },
  editableCueInput: {
    borderWidth: 1,
    borderColor: theme.colors.accent_highlight,
    borderRadius: 6,
    padding: 8,
    minHeight: 44,
  },
});
