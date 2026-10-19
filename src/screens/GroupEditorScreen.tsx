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

import { useUnsavedChangesPrompt } from '../lib/useUnsavedChangesPrompt';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { SetlistGroup } from '../types';

type GroupEditorScreenProps = {
  group?: SetlistGroup;
  onCancel: () => void;
  onSave: (name: string) => void;
};

export default function GroupEditorScreen({
  group,
  onCancel,
  onSave,
}: GroupEditorScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(group?.name ?? '');

  const { runSave } = useUnsavedChangesPrompt({
    snapshot: name,
    canSave: () => name.trim().length > 0,
    save: () => save(),
  });

  const save = () => {
    if (!name.trim()) {
      return;
    }
    try {
      runSave(() => onSave(name));
    } catch (error) {
      Alert.alert(
        group ? 'Rename failed' : 'Create failed',
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
          <Text style={styles.label}>Group name</Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={save}
            placeholder="e.g. The Blue Notes"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Group name"
          />
          <Text style={styles.helpText}>
            Groups organize setlists on the dashboard. Setlists remain on the dashboard if a group is removed.
          </Text>
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
            <Text style={styles.saveText}>{group ? 'Save group' : 'Create group'}</Text>
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
    gap: 10,
  },
  label: {
    color: theme.colors.text_secondary,
    fontSize: 14,
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
  helpText: {
    color: theme.colors.text_secondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
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
