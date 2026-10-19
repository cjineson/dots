import React, { useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { theme } from '../theme';
import { FONT_SIZE_STEP, MAX_FONT_SIZE, MIN_FONT_SIZE } from '../lib/fontSize';

const SLIDER_HORIZONTAL_INSET = 10;

type FontSizeZoomControlProps = {
  label: string;
  value: number;
  onValueChange: (value: number, persist: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
};

export default function FontSizeZoomControl({
  label,
  value,
  onValueChange,
  min = MIN_FONT_SIZE,
  max = MAX_FONT_SIZE,
  step = FONT_SIZE_STEP,
}: FontSizeZoomControlProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const hitAreaRef = useRef<View>(null);
  const hitAreaLeft = useRef<number | null>(null);
  const progress = (value - min) / (max - min);

  const setValueFromX = (x: number, persist: boolean) => {
    if (trackWidth <= 0 || !Number.isFinite(x)) {
      return;
    }
    const position = Math.max(0, Math.min(1, (x - SLIDER_HORIZONTAL_INSET) / trackWidth));
    const steps = Math.round(position * ((max - min) / step));
    onValueChange(min + steps * step, persist);
  };

  // locationX is missing on web, so fall back to pageX relative to the measured slider.
  const setValueFromEvent = (event: GestureResponderEvent, persist: boolean) => {
    const { locationX, pageX } = event.nativeEvent;
    if (Number.isFinite(locationX)) {
      setValueFromX(locationX, persist);
    } else if (hitAreaLeft.current !== null) {
      setValueFromX(pageX - hitAreaLeft.current, persist);
    }
  };

  const handleGrant = (event: GestureResponderEvent) => {
    const { locationX, pageX } = event.nativeEvent;
    hitAreaRef.current?.measureInWindow((left) => {
      hitAreaLeft.current = left;
      setValueFromX(Number.isFinite(locationX) ? locationX : pageX - left, false);
    });
  };

  return (
    <View style={styles.controlGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controlRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          disabled={value <= min}
          onPress={() => onValueChange(Math.max(min, value - step), true)}
          style={[styles.stepButton, value <= min && styles.disabledButton]}
        >
          <MaterialCommunityIcons
            name="magnify-minus-outline"
            size={34}
            color={theme.colors.accent_highlight}
          />
        </Pressable>
        <View
          ref={hitAreaRef}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: min, max: max, now: value }}
          accessibilityActions={[
            { name: 'increment', label: 'Increase text size' },
            { name: 'decrement', label: 'Decrease text size' },
          ]}
          onAccessibilityAction={(event) =>
            onValueChange(
              Math.max(
                min,
                Math.min(
                  max,
                  value + (event.nativeEvent.actionName === 'increment'
                    ? step
                    : -step),
                ),
              ),
              true,
            )
          }
          onLayout={(event) =>
            setTrackWidth(
              Math.max(1, event.nativeEvent.layout.width - SLIDER_HORIZONTAL_INSET * 2),
            )
          }
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleGrant}
          onResponderMove={(event) => setValueFromEvent(event, false)}
          onResponderRelease={(event) => setValueFromEvent(event, true)}
          onResponderTerminate={(event) => setValueFromEvent(event, true)}
          style={styles.sliderHitArea}
        >
          <View pointerEvents="none" style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          disabled={value >= max}
          onPress={() => onValueChange(Math.min(max, value + step), true)}
          style={[styles.stepButton, value >= max && styles.disabledButton]}
        >
          <MaterialCommunityIcons
            name="magnify-plus-outline"
            size={34}
            color={theme.colors.accent_highlight}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlGroup: {
    marginBottom: 8,
  },
  label: {
    marginBottom: 4,
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 68,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  stepButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
  },
  sliderHitArea: {
    flex: 1,
    minWidth: 40,
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border_contrast,
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent_highlight,
  },
  thumb: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderWidth: 2,
    borderColor: theme.colors.background,
    borderRadius: 11,
    backgroundColor: theme.colors.accent_highlight,
  },
  value: {
    minWidth: 34,
    color: theme.colors.text_primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
});
