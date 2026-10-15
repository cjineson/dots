import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import type { CueBlock } from '../types';

type PerformanceCueContentProps = {
  blocks: CueBlock[];
  fontScale?: number;
};

const MIN_FONT_SIZE = 10;

export default function PerformanceCueContent({
  blocks,
  fontScale = 1,
}: PerformanceCueContentProps) {
  return (
    <>
      {blocks.map((block) => {
        const fontSize = Math.max(
          MIN_FONT_SIZE,
          (block.font_size ?? theme.typography.box_text_size) * fontScale,
        );
        const color = block.color ?? theme.colors.text_primary;

        if (block.type === 'table') {
          return (
            <View key={block.id} style={styles.performanceTable}>
              {block.rows.map((row, rowIndex) => (
                <View key={`${block.id}-row-${rowIndex}`} style={styles.performanceTableRow}>
                  {row.map((cell, columnIndex) => (
                    <Text
                      key={`${block.id}-cell-${rowIndex}-${columnIndex}`}
                      style={[styles.performanceTableCell, { color, fontSize }]}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text
            key={block.id}
            style={[
              styles.cueText,
              block.type === 'section' && styles.sectionText,
              {
                color,
                fontSize,
                marginBottom: block.type === 'section' ? 12 : 4,
              },
            ]}
          >
            {block.text}
          </Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
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
});
