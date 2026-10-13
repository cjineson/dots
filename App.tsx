import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import LivePerformanceScreen from './src/screens/LivePerformanceScreen';
import SongEditorScreen from './src/screens/SongEditorScreen';
import { createSetlist, getSetlistsWithSongs, initializeDatabase, saveSongForSetlist } from './src/lib/db';
import { theme } from './src/theme';
import type { Song, SetlistWithSongs } from './src/types';

type RootStackParamList = {
  Dashboard: undefined;
  Editor: { setlistId: string; song?: Song };
  Performance: { song: Song };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [setlists, setSetlists] = useState<SetlistWithSongs[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshSetlists = () => {
    setSetlists(getSetlistsWithSongs());
  };

  useEffect(() => {
    initializeDatabase();
    refreshSetlists();
    setIsReady(true);
  }, []);

  const handleSaveSong = (
    setlistId: string,
    existingSong: Song | undefined,
    { title, notesRawText }: { title: string; notesRawText: string },
    onSaved: () => void,
  ) => {
    const savedSong = saveSongForSetlist({
      setlistId,
      songId: existingSong?.id,
      title,
      notes_raw_text: notesRawText,
    });

    refreshSetlists();
    onSaved();
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.accent_highlight} />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text_primary,
          headerTitleStyle: { color: theme.colors.text_primary },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Dashboard" options={{ headerShown: false }}>
          {({ navigation }) => (
            <DashboardScreen
              setlists={setlists}
              onCreateSetlist={(name) => {
                const createdSetlist = createSetlist(name);
                refreshSetlists();
                navigation.navigate('Editor', { setlistId: createdSetlist.id });
              }}
              onOpenSongForEdit={(setlistId, song) =>
                navigation.navigate('Editor', { setlistId, song })
              }
              onOpenPerformance={(song) => navigation.navigate('Performance', { song })}
              onOpenNewSong={(setlistId) => navigation.navigate('Editor', { setlistId })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Editor"
          options={({ route }) => ({ title: route.params.song ? 'Edit Song' : 'New Song' })}
        >
          {({ navigation, route }) => (
            <SongEditorScreen
              setlistId={route.params.setlistId}
              initialSong={route.params.song}
              onCancel={() => navigation.goBack()}
              onSave={(payload) =>
                handleSaveSong(route.params.setlistId, route.params.song, payload, () =>
                  navigation.popToTop(),
                )
              }
              onPlay={(song) => navigation.navigate('Performance', { song })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Performance"
          options={({ route }) => ({ title: route.params.song.title })}
        >
          {({ route }) => <LivePerformanceScreen song={route.params.song} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
