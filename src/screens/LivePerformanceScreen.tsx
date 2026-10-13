import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';

import { parseBoxes } from '../lib/parser';
import { theme } from '../theme';
import type { Song } from '../types';

type LivePerformanceScreenProps = {
  song: Song;
};

export default function LivePerformanceScreen({ song }: LivePerformanceScreenProps) {
  const [activeIndexes, setActiveIndexes] = useState<number[]>([]);
  const boxes = parseBoxes(song.notes_raw_text);

  const toggleBox = (index: number) => {
    setActiveIndexes((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={boxes}
        numColumns={2}
        keyExtractor={(item, index) => `${item}-${index}`}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isActive = activeIndexes.includes(index);

          return (
            <Pressable
              style={[
                styles.box,
                { backgroundColor: isActive ? theme.colors.box_active_state : theme.colors.surface_card },
                isActive && styles.boxActive,
              ]}
              onPress={() => toggleBox(index)}
            >
              <Text style={styles.boxText}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: theme.layout.grid_gap,
  },
  box: {
    flex: 1,
    minHeight: 104,
    maxWidth: '48%',
    borderWidth: 2,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  boxActive: {
    borderColor: theme.colors.accent_highlight,
  },
  boxText: {
    color: theme.colors.text_primary,
    fontSize: theme.typography.box_text_size,
    fontWeight: '600',
    textAlign: 'center',
  },
});
