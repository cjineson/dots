import React, { useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import type { BarSize } from '../lib/settings';
import { FONT_SIZE_STEP, MAX_FONT_SIZE, MIN_FONT_SIZE } from '../lib/fontSize';

const SLIDER_HORIZONTAL_INSET = 10;

const SIZE_METRICS: Record<BarSize, { button: number; icon: number; track: number; thumb: number; compact?: boolean }> = {
  xxs: { button: 24, icon: 16, track: 3, thumb: 11, compact: true },
  xs: { button: 32, icon: 20, track: 4, thumb: 14, compact: true },
  s: { button: 48, icon: 28, track: 5, thumb: 18 },
  m: { button: 60, icon: 34, track: 6, thumb: 22 },
  l: { button: 76, icon: 42, track: 10, thumb: 32 },
  xl: { button: 92, icon: 50, track: 14, thumb: 42 },
};

type FontSizeZoomControlProps = {
  label: string;
  value: number;
  onValueChange: (value: number, persist: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
  decreaseIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  increaseIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  decreaseLabel?: string;
  increaseLabel?: string;
  curve?: number;
  size?: BarSize;
};

export default function FontSizeZoomControl({
  label,
  value,
  onValueChange,
  min = MIN_FONT_SIZE,
  max = MAX_FONT_SIZE,
  step = FONT_SIZE_STEP,
  decreaseIcon = 'magnify-minus-outline',
  increaseIcon = 'magnify-plus-outline',
  decreaseLabel = 'Zoom out',
  increaseLabel = 'Zoom in',
  curve = 1,
  size = 'm',
}: FontSizeZoomControlProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, SIZE_METRICS[size]), [theme, size]);
  const [trackWidth, setTrackWidth] = useState(0);
  const hitAreaRef = useRef<React.ComponentRef<typeof View>>(null);
  const hitAreaLeft = useRef<number | null>(null);
  // curve > 1 gives the low end of the range more of the slider travel.
  const progress = Math.pow(Math.max(0, Math.min(1, (value - min) / (max - min))), 1 / curve);

  const setValueFromX = (x: number, persist: boolean) => {
    if (trackWidth <= 0 || !Number.isFinite(x)) {
      return;
    }
    const position = Math.max(0, Math.min(1, (x - SLIDER_HORIZONTAL_INSET) / trackWidth));
    const steps = Math.round(Math.pow(position, curve) * ((max - min) / step));
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
      {size !== 'xxs' && <Text style={styles.label}>{label}</Text>}
      <View style={styles.controlRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          disabled={value <= min}
          onPress={() => onValueChange(Math.max(min, value - step), true)}
          style={[styles.stepButton, value <= min && styles.disabledButton]}
        >
          <MaterialCommunityIcons
            name={decreaseIcon}
            size={SIZE_METRICS[size].icon}
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
            { name: 'increment', label: increaseLabel },
            { name: 'decrement', label: decreaseLabel },
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
          accessibilityLabel={increaseLabel}
          disabled={value >= max}
          onPress={() => onValueChange(Math.min(max, value + step), true)}
          style={[styles.stepButton, value >= max && styles.disabledButton]}
        >
          <MaterialCommunityIcons
            name={increaseIcon}
            size={SIZE_METRICS[size].icon}
            color={theme.colors.accent_highlight}
          />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme, m: (typeof SIZE_METRICS)[BarSize]) => StyleSheet.create({
  controlGroup: {
    marginBottom: m.compact ? 2 : 8,
  },
  label: {
    marginBottom: m.compact ? 2 : 4,
    color: theme.colors.text_secondary,
    fontSize: m.compact ? 11 : 12,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: m.compact ? 4 : 8,
    minHeight: m.button + (m.compact ? 4 : 8),
    paddingHorizontal: m.compact ? 4 : 8,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  stepButton: {
    width: m.button,
    height: m.button,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.surface_card,
  },
  sliderHitArea: {
    flex: 1,
    minWidth: 40,
    height: m.button,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  track: {
    height: m.track,
    borderRadius: m.track / 2,
    backgroundColor: theme.colors.border_contrast,
  },
  trackFill: {
    height: m.track,
    borderRadius: m.track / 2,
    backgroundColor: theme.colors.accent_highlight,
  },
  thumb: {
    position: 'absolute',
    top: (m.track - m.thumb) / 2 - 2,
    width: m.thumb,
    height: m.thumb,
    marginLeft: -m.thumb / 2,
    borderWidth: 2,
    borderColor: theme.colors.background,
    borderRadius: m.thumb / 2,
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
