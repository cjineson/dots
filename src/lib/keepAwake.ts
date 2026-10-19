import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const KEEP_AWAKE_TAG = 'gigbox-performance';

export function useScreenAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => undefined);
    };
  }, [enabled]);
}
