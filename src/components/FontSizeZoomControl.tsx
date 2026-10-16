import React, { useState } from 'react';
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
  value: number;
  onValueChange: (value: number, persist: boolean) => void;
};

export default function FontSizeZoomControl({
  value,
  onValueChange,
}: FontSizeZoomControlProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = (value - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE);

  const setValueFromEvent = (event: GestureResponderEvent, persist: boolean) => {
    if (trackWidth <= 0) {
      return;
    }
    const position = Math.max(
      0,
      Math.min(
        1,
        (event.nativeEvent.locationX - SLIDER_HORIZONTAL_INSET) / trackWidth,
      ),
    );
    const steps = Math.round(
      position * ((MAX_FONT_SIZE - MIN_FONT_SIZE) / FONT_SIZE_STEP),
    );
    onValueChange(MIN_FONT_SIZE + steps * FONT_SIZE_STEP, persist);
  };

  return (
    <View style={styles.controlRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        disabled={value <= MIN_FONT_SIZE}
        onPress={() => onValueChange(Math.max(MIN_FONT_SIZE, value - FONT_SIZE_STEP), true)}
        style={[styles.stepButton, value <= MIN_FONT_SIZE && styles.disabledButton]}
      >
        <MaterialCommunityIcons
          name="magnify-minus-outline"
          size={34}
          color={theme.colors.accent_highlight}
        />
      </Pressable>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Song text size"
        accessibilityValue={{ min: MIN_FONT_SIZE, max: MAX_FONT_SIZE, now: value }}
        accessibilityActions={[
          { name: 'increment', label: 'Increase text size' },
          { name: 'decrement', label: 'Decrease text size' },
        ]}
        onAccessibilityAction={(event) =>
          onValueChange(
            Math.max(
              MIN_FONT_SIZE,
              Math.min(
                MAX_FONT_SIZE,
                value + (event.nativeEvent.actionName === 'increment'
                  ? FONT_SIZE_STEP
                  : -FONT_SIZE_STEP),
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
        onResponderGrant={(event) => setValueFromEvent(event, false)}
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
        disabled={value >= MAX_FONT_SIZE}
        onPress={() => onValueChange(Math.min(MAX_FONT_SIZE, value + FONT_SIZE_STEP), true)}
        style={[styles.stepButton, value >= MAX_FONT_SIZE && styles.disabledButton]}
      >
        <MaterialCommunityIcons
          name="magnify-plus-outline"
          size={34}
          color={theme.colors.accent_highlight}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 68,
    marginBottom: 8,
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
