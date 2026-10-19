import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { SetlistGroup, SetlistWithSongs } from '../types';

type SetlistDetailsScreenProps = {
  setlist: SetlistWithSongs;
  groups: SetlistGroup[];
  onCancel: () => void;
  onSave: (
    name: string,
    details: {
      location: string;
      date: string;
      time: string;
      groupId: string | null;
    },
  ) => void;
};

export default function SetlistDetailsScreen({
  setlist,
  groups,
  onCancel,
  onSave,
}: SetlistDetailsScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(setlist.name);
  const [location, setLocation] = useState(setlist.location ?? '');
  const [date, setDate] = useState(setlist.date ?? '');
  const [time, setTime] = useState(setlist.time ?? '');
  const [groupId, setGroupId] = useState<string | null>(setlist.group_id ?? null);

  const save = () => {
    if (!name.trim()) {
      return;
    }
    try {
      onSave(name, { location, date, time, groupId });
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            placeholder="Setlist name"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Setlist name"
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            returnKeyType="next"
            placeholder="Optional"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Setlist location"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                returnKeyType="next"
                placeholder="Optional"
                placeholderTextColor={theme.colors.text_secondary}
                style={styles.input}
                accessibilityLabel="Setlist date"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                returnKeyType="done"
                placeholder="Optional"
                placeholderTextColor={theme.colors.text_secondary}
                style={styles.input}
                accessibilityLabel="Setlist time"
              />
            </View>
          </View>

          <Text style={styles.label}>Group</Text>
          <View style={styles.groupOptions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: groupId === null }}
              onPress={() => setGroupId(null)}
              style={[styles.groupChoice, groupId === null && styles.groupChoiceSelected]}
            >
              <Text style={[styles.groupChoiceText, groupId === null && styles.selectedText]}>
                No group
              </Text>
            </Pressable>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected: groupId === group.id }}
                onPress={() => setGroupId(group.id)}
                style={[
                  styles.groupChoice,
                  groupId === group.id && styles.groupChoiceSelected,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.groupChoiceText, groupId === group.id && styles.selectedText]}
                >
                  {group.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={!name.trim()}
            style={[styles.saveButton, !name.trim() && styles.disabledButton]}
          >
            <Text style={styles.saveText}>Save setlist</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 8,
  },
  label: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    color: theme.colors.text_primary,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    gap: 8,
  },
  groupOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  groupChoice: {
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupChoiceSelected: {
    borderColor: theme.colors.accent_highlight,
    backgroundColor: theme.colors.surface_card,
  },
  groupChoiceText: {
    color: theme.colors.text_secondary,
    fontSize: 14,
  },
  selectedText: {
    color: theme.colors.accent_highlight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.background,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    color: theme.colors.text_secondary,
    fontSize: 15,
  },
  saveButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.accent_highlight,
    paddingHorizontal: 18,
  },
  saveText: {
    color: theme.colors.background,
    fontWeight: theme.typography.font_weight_bold,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
