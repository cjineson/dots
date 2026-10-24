import React, { useEffect, useMemo, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../themeContext';

type Props = {
  onCreateSetlist: () => void;
};

const NOTES = [
  { icon: 'music-note', color: 'action_primary', left: '8%', size: 26, delay: 0 },
  { icon: 'music-note-eighth', color: 'action_copy', left: '28%', size: 22, delay: 700 },
  { icon: 'music-clef-treble', color: 'action_extra', left: '52%', size: 28, delay: 1400 },
  { icon: 'music-note-eighth', color: 'action_edit', left: '72%', size: 22, delay: 2100 },
  { icon: 'music-note', color: 'action_primary', left: '88%', size: 24, delay: 2800 },
] as const;

const RISE_MS = 4200;

function FloatingNote({ note, animate }: { note: (typeof NOTES)[number]; animate: boolean }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      progress.setValue(0.5);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(note.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: RISE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, note.delay, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: note.left,
        opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) },
          { translateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, -8] }) },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '14deg'] }) },
        ],
      }}
    >
      <MaterialCommunityIcons name={note.icon} size={note.size} color={theme.colors[note.color]} />
    </Animated.View>
  );
}

export default function EmptyDashboard({ onCreateSetlist }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [animate, setAnimate] = React.useState(true);
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => mounted && setAnimate(!reduce))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!animate) {
      entrance.setValue(1);
      pulse.setValue(0);
      return undefined;
    }
    entrance.setValue(0);
    Animated.spring(entrance, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, entrance, pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {NOTES.map((note, index) => (
          <FloatingNote key={index} note={note} animate={animate} />
        ))}
        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            ],
          }}
        >
          <Image
            source={require('../../assets/branding/gigbox-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="GigBox"
          />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: entrance, alignItems: 'center' }}>
        <Text style={styles.title}>Your stage is set</Text>
        <Text style={styles.subtitle}>
          Build your first setlist, add songs and cues, then tap a title to go live.
        </Text>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create your first setlist"
          onPress={onCreateSetlist}
          style={styles.cta}
        >
          <MaterialCommunityIcons name="playlist-plus" size={22} color={theme.colors.on_accent} />
          <Text style={styles.ctaText}>Create your first setlist</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.hint}>
        Restoring from a backup? Import it from Settings.
      </Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  stage: {
    width: '100%',
    maxWidth: 360,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 220,
    height: 63,
  },
  title: {
    color: colors.text_primary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text_secondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: colors.accent_highlight,
  },
  ctaText: {
    color: colors.on_accent,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: colors.text_secondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
