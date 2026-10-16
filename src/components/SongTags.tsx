import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SongTag } from '../types';

type SongTagsProps = {
  tags?: SongTag[];
  compact?: boolean;
};

export default function SongTags({ tags = [], compact = false }: SongTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  const tagLabels = tags.map((tag, index) => (
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
  ));

  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.compactTagsScroll}
        contentContainerStyle={[styles.tags, styles.compactTags]}
      >
        {tagLabels}
      </ScrollView>
    );
  }

  return (
    <View style={styles.tags}>
      {tagLabels}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactTagsScroll: {
    maxWidth: 220,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  compactTags: {
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
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
    maxWidth: 180,
  },
});
