import React, { useMemo, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
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

import { DEFAULT_GROUP_IMAGE_SIZE, isGroupImage } from '../lib/groupDetails';
import { useUnsavedChangesPrompt } from '../lib/useUnsavedChangesPrompt';
import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { GroupDetails, SetlistGroup } from '../types';

type GroupEditorScreenProps = {
  group?: SetlistGroup;
  onCancel: () => void;
  onSave: (name: string, details: GroupDetails) => void;
};

export default function GroupEditorScreen({
  group,
  onCancel,
  onSave,
}: GroupEditorScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [image, setImage] = useState<string | null>(group?.image ?? null);
  const [originalSize, setOriginalSize] = useState(false);
  const [picking, setPicking] = useState(false);

  const { runSave } = useUnsavedChangesPrompt({
    snapshot: JSON.stringify({ name, description, image }),
    canSave: () => name.trim().length > 0 && !picking,
    save: () => save(),
  });

  const save = () => {
    if (!name.trim() || picking) {
      return;
    }
    runSave(
      () => onSave(name, { description: description.trim() ? description : null, image }),
      (error) =>
        Alert.alert(
          group ? 'Save failed' : 'Create failed',
          error instanceof Error ? error.message : 'An unexpected error occurred.',
        ),
    );
  };

  const chooseImage = async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const png = asset.mimeType === 'image/png' || asset.fileName?.toLowerCase().endsWith('.png');
      const context = ImageManipulator.manipulate(asset.uri, originalSize ? undefined : {
        maxWidth: DEFAULT_GROUP_IMAGE_SIZE, maxHeight: DEFAULT_GROUP_IMAGE_SIZE,
      });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: png ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.85, base64: true });
      if (!saved.base64) throw new Error('The image could not be encoded.');
      const data = `data:image/${png ? 'png' : 'jpeg'};base64,${saved.base64}`;
      if (!isGroupImage(data)) throw new Error('The image is too large to save. Try the smaller size option.');
      setImage(data);
    } catch (error) {
      Alert.alert('Could not add image', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setPicking(false);
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
            placeholder="e.g. The Blue Notes"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Group name"
          />
          <Text style={styles.helpText}>
            Groups organize setlists on the dashboard. Setlists remain on the dashboard if a group is removed.
          </Text>
          <Text style={styles.label}>Description</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="A little about this group..."
            placeholderTextColor={theme.colors.text_secondary}
            style={[styles.input, styles.description]}
            accessibilityLabel="Group description"
          />
          <Text style={styles.label}>Group image</Text>
          {image && <Image source={{ uri: image }} style={styles.image} resizeMode="contain" accessibilityLabel="Group image preview" />}
          <Text style={styles.helpText}>Choose a size before adding an image. Smaller images are easier to share.</Text>
          <View style={styles.sizeChoices}>
            {[false, true].map((original) => (
              <Pressable key={String(original)} accessibilityRole="radio" accessibilityState={{ checked: originalSize === original }}
                onPress={() => setOriginalSize(original)} style={[styles.sizeChoice, originalSize === original && styles.selectedChoice]}>
                <Text style={styles.cancelText}>{original ? 'Original resolution' : 'Smaller (1024 px)'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={picking} onPress={() => void chooseImage()} style={styles.imageButton}>
            <Text style={styles.cancelText}>{picking ? 'Preparing image...' : image ? 'Change image' : 'Add image'}</Text>
          </Pressable>
          {image && <Pressable accessibilityRole="button" disabled={picking} onPress={() => setImage(null)} style={styles.imageButton}>
            <Text style={styles.cancelText}>Remove image</Text>
          </Pressable>}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={!name.trim() || picking}
            style={[styles.saveButton, (!name.trim() || picking) && styles.disabledButton]}
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
  description: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
  },
  sizeChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChoice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
  },
  selectedChoice: {
    borderColor: theme.colors.accent_highlight,
    backgroundColor: theme.colors.box_active_state,
  },
  imageButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
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
