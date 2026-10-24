import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Options = {
  snapshot: string;
  canSave?: () => boolean;
  save?: () => void;
};

/**
 * Prompts before leaving an editor with unsaved changes. Wrap explicit save
 * actions with the returned `runSave` so they are not intercepted.
 */
export function useUnsavedChangesPrompt({ snapshot, canSave, save }: Options) {
  const navigation = useNavigation();
  const initialSnapshot = useRef(snapshot);
  const saving = useRef(false);
  const latest = useRef({ snapshot, canSave, save });
  latest.current = { snapshot, canSave, save };

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        const current = latest.current;
        if (saving.current || current.snapshot === initialSnapshot.current) {
          return;
        }
        event.preventDefault();
        const buttons: AlertButton[] = [
          { text: 'Keep editing', style: 'cancel' as const },
          {
            text: 'Discard',
            style: 'destructive' as const,
            onPress: () => {
              saving.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ];
        if (current.save && (current.canSave?.() ?? true)) {
          buttons.push({
            text: 'Save',
            onPress: () => current.save?.(),
          });
        }
        Alert.alert('Unsaved changes', 'You have changes that have not been saved.', buttons);
      }),
    [navigation],
  );

  const runSave = (action: () => void) => {
    saving.current = true;
    try {
      action();
    } finally {
      saving.current = false;
    }
  };

  return { runSave };
}
