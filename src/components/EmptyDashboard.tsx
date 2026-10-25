import React, { useEffect, useMemo, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../themeContext';

type Props = {
  onCreateSetlist: () => void;
  onCreateGroup: () => void;
  onCreateSong: () => void;
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

export default function EmptyDashboard({
  onCreateSetlist,
  onCreateGroup,
  onCreateSong,
}: Props) {
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
        <Text style={styles.title}>Start with anything</Text>
        <Text style={styles.subtitle}>
          Create a group, setlist, or song. You can organize songs into setlists and groups later.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.createOptions,
          { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a group"
          onPress={onCreateGroup}
          style={[styles.createOption, { borderColor: theme.colors.action_edit }]}
        >
          <MaterialCommunityIcons name="folder-plus" size={22} color={theme.colors.action_edit} />
          <Text style={styles.createOptionText}>Group</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a setlist"
          onPress={onCreateSetlist}
          style={[styles.createOption, { borderColor: theme.colors.action_primary }]}
        >
          <MaterialCommunityIcons name="playlist-plus" size={22} color={theme.colors.action_primary} />
          <Text style={styles.createOptionText}>Setlist</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a song"
          onPress={onCreateSong}
          style={[styles.createOption, { borderColor: theme.colors.action_extra }]}
        >
          <MaterialCommunityIcons name="music-note-plus" size={22} color={theme.colors.action_extra} />
          <Text style={styles.createOptionText}>Song</Text>
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
  createOptions: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  createOption: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface_card,
  },
  createOptionText: {
    color: colors.text_primary,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: colors.text_secondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
