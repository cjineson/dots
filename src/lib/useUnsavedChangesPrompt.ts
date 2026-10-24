import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

type Options = {
  snapshot: string;
  canSave?: () => boolean;
  save?: () => void;
};

type PendingAction = { run: () => void; onError?: (error: unknown) => void };

/**
 * Prompts before leaving an editor with unsaved changes. Uses `usePreventRemove`
 * (not a bare `beforeRemove` listener) so native-stack also blocks the iOS swipe
 * and header back button instead of dismissing the screen behind the prompt.
 * Wrap explicit save actions with the returned `runSave`; it lifts the guard,
 * runs the action after the next render, and reports a thrown error to `onError`.
 */
export function useUnsavedChangesPrompt({ snapshot, canSave, save }: Options) {
  const navigation = useNavigation();
  const initialSnapshot = useRef(snapshot);
  const [leaving, setLeaving] = useState(false);
  const pendingAction = useRef<PendingAction | null>(null);
  const promptOpen = useRef(false);
  const latest = useRef({ canSave, save });
  latest.current = { canSave, save };

  const prevented = snapshot !== initialSnapshot.current && !leaving;

  const reportError = (error: unknown, onError?: (error: unknown) => void) => {
    if (onError) {
      onError(error);
      return;
    }
    Alert.alert(
      'Save failed',
      error instanceof Error ? error.message : 'An unexpected error occurred.',
    );
  };

  const finish = (run: () => void, onError?: (error: unknown) => void) => {
    pendingAction.current = { run, onError };
    setLeaving(true);
  };

  // Runs after the re-render that lifted the prevent-remove guard.
  useEffect(() => {
    if (!leaving || !pendingAction.current) {
      return;
    }
    const { run, onError } = pendingAction.current;
    pendingAction.current = null;
    try {
      run();
    } catch (error) {
      setLeaving(false);
      reportError(error, onError);
    }
  }, [leaving]);

  usePreventRemove(prevented, ({ data }) => {
    if (promptOpen.current) {
      return;
    }
    promptOpen.current = true;
    const close = () => {
      promptOpen.current = false;
    };
    const buttons: AlertButton[] = [
      { text: 'Keep editing', style: 'cancel', onPress: close },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          close();
          finish(() => navigation.dispatch(data.action));
        },
      },
    ];
    if (latest.current.save && (latest.current.canSave?.() ?? true)) {
      buttons.push({
        text: 'Save',
        onPress: () => {
          close();
          latest.current.save?.();
        },
      });
    }
    Alert.alert('Unsaved changes', 'You have changes that have not been saved.', buttons, {
      cancelable: true,
      onDismiss: close,
    });
  });

  const runSave = (action: () => void, onError?: (error: unknown) => void) => {
    if (prevented) {
      finish(action, onError);
      return;
    }
    try {
      action();
    } catch (error) {
      reportError(error, onError);
    }
  };

  return { runSave };
}
