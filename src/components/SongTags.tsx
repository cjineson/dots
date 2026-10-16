import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SongTag } from '../types';

type SongTagsProps = {
  tags?: SongTag[];
  compact?: boolean;
};

export default function SongTags({ tags = [], compact = false }: SongTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.tags}>
      {tags.map((tag, index) => (
        <Text
          key={`${tag.label}-${index}`}
          numberOfLines={compact ? 1 : undefined}
          style={[
            styles.tag,
            compact && styles.compactTag,
            { borderColor: tag.color, color: tag.color },
          ]}
        >
          {tag.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  compactTag: {
    maxWidth: 118,
  },
});
