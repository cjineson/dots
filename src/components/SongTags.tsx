import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SongTag } from '../types';

type SongTagsProps = {
  tags?: SongTag[];
  compact?: boolean;
  wrapCompact?: boolean;
  fullWidth?: boolean;
  scale?: number;
};

export default function SongTags({
  tags = [],
  compact = false,
  wrapCompact = false,
  fullWidth = false,
  scale = 1,
}: SongTagsProps) {
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
        scale !== 1 && {
          fontSize: 12 * scale,
          paddingHorizontal: 8 * scale,
          paddingVertical: 3 * scale,
          borderRadius: 10 * scale,
          maxWidth: compact ? 180 * scale : undefined,
        },
      ]}
    >
      {tag.label}
    </Text>
  ));

  if (compact && !wrapCompact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.compactTagsScroll,
          scale !== 1 && { maxWidth: 220 * scale },
          fullWidth && styles.fullWidthTagsScroll,
        ]}
        contentContainerStyle={[
          styles.tags,
          styles.compactTags,
          fullWidth && styles.fullWidthTagsContent,
        ]}
      >
        {tagLabels}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.tags,
        compact && styles.compactTags,
        compact && wrapCompact && styles.wrappedCompactTags,
      ]}
    >
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
  fullWidthTagsScroll: {
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  fullWidthTagsContent: {
    flexGrow: 1,
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
  wrappedCompactTags: {
    width: '100%',
    flexWrap: 'wrap',
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
