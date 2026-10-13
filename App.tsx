import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import FlowScreen from './src/screens/FlowScreen';
import LivePerformanceScreen from './src/screens/LivePerformanceScreen';
import SongEditorScreen from './src/screens/SongEditorScreen';
import {
  createSetlist,
  deleteSetlist,
  getSetlistsWithSongs,
  importSetlists,
  initializeDatabase,
  renameSetlist,
  reorderSongsForSetlist,
  saveSongForSetlist,
  updateSongFontSize,
} from './src/lib/db';
import { createSetlistArchive, parseSetlistArchive } from './src/lib/setlistArchive';
import { theme } from './src/theme';
import type { Song, SetlistWithSongs } from './src/types';

type RootStackParamList = {
  Dashboard: undefined;
  Editor: { setlistId: string; song?: Song };
  Performance: { songs: Song[]; index: number };
  Flow: { setlistName: string; songs: Song[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MINIMUM_SPLASH_DURATION_MS = 2000;
const appStartedAt = Date.now();

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('Failed to keep the splash screen visible during startup.', error);
});

export default function App() {
  const [setlists, setSetlists] = useState<SetlistWithSongs[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshSetlists = () => {
    setSetlists(getSetlistsWithSongs());
  };

  useEffect(() => {
    initializeDatabase();
    refreshSetlists();

    const remainingSplashTime = Math.max(
      0,
      MINIMUM_SPLASH_DURATION_MS - (Date.now() - appStartedAt),
    );
    const timeout = setTimeout(() => setIsReady(true), remainingSplashTime);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.error('Failed to hide the splash screen after startup.', error);
      });
    }
  }, [isReady]);

  const handleSaveSong = (
    setlistId: string,
    existingSong: Song | undefined,
    {
      title,
      notesRawText,
      cueDocument,
    }: { title: string; notesRawText: string; cueDocument: string },
    onSaved: () => void,
  ) => {
    saveSongForSetlist({
      setlistId,
      songId: existingSong?.id,
      title,
      notes_raw_text: notesRawText,
      cue_document: cueDocument,
    });

    refreshSetlists();
    onSaved();
  };

  const handleReorderSongs = (setlistId: string, songs: Song[]) => {
    reorderSongsForSetlist(setlistId, songs);
    refreshSetlists();
  };

  const handleRenameSetlist = (setlistId: string, name: string) => {
    renameSetlist(setlistId, name);
    refreshSetlists();
  };

  const handleDeleteSetlist = (setlistId: string) => {
    deleteSetlist(setlistId);
    refreshSetlists();
  };

  const handleSongFontSizeChange = (songId: string, fontSize: number) => {
    updateSongFontSize(songId, fontSize);
    refreshSetlists();
  };

  const handleExportLibrary = async () => {
    try {
      if (setlists.length === 0) {
        Alert.alert('Nothing to export', 'Create a setlist before exporting your library.');
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('File sharing is not available on this device.');
      }
      if (!FileSystem.cacheDirectory) {
        throw new Error('The temporary file directory is not available.');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileUri = `${FileSystem.cacheDirectory}gigbox-library-${timestamp}.json`;
      const archive = createSetlistArchive(setlists);
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(archive, null, 2));
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export GigBox setlists',
        UTI: 'public.json',
      });
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  const handleImportLibrary = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        return;
      }

      const json = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const importedSetlists = parseSetlistArchive(json);
      importSetlists(importedSetlists);
      refreshSetlists();
      Alert.alert('Import complete', `Added ${importedSetlists.length} setlist(s).`);
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  if (!isReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color={theme.colors.accent_highlight} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
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
                onCreateSetlist={() => {
                  createSetlist('New Setlist');
                  refreshSetlists();
                }}
                onRenameSetlist={handleRenameSetlist}
                onDeleteSetlist={handleDeleteSetlist}
                onOpenFlow={(setlist) =>
                  navigation.navigate('Flow', {
                    setlistName: setlist.name,
                    songs: setlist.songs,
                  })
                }
                onOpenSongForEdit={(setlistId, song) =>
                  navigation.navigate('Editor', { setlistId, song })
                }
                onOpenPerformance={(songs, index) =>
                  navigation.navigate('Performance', { songs, index })
                }
                onOpenNewSong={(setlistId) => navigation.navigate('Editor', { setlistId })}
                onReorderSongs={handleReorderSongs}
                onExportLibrary={handleExportLibrary}
                onImportLibrary={handleImportLibrary}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Flow"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            {({ navigation, route }) => (
              <FlowScreen
                setlistName={route.params.setlistName}
                songs={route.params.songs}
                onGoToDashboard={() => navigation.popToTop()}
                onFontSizeChange={handleSongFontSizeChange}
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
                onPlay={(song) => {
                  const storedSongs = setlists.find(
                    (setlist) => setlist.id === route.params.setlistId,
                  )?.songs;
                  const storedSongIndex = storedSongs?.findIndex(
                    (storedSong) => storedSong.id === song.id,
                  );
                  const songs =
                    storedSongs && storedSongIndex !== undefined && storedSongIndex >= 0
                    ? storedSongs.map((storedSong) => (storedSong.id === song.id ? song : storedSong))
                    : [song];
                  const index = songs.findIndex((setlistSong) => setlistSong.id === song.id);
                  navigation.navigate('Performance', { songs, index });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Performance"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            {({ navigation, route }) => (
              <LivePerformanceScreen
                songs={route.params.songs}
                index={route.params.index}
                onGoToDashboard={() => navigation.popToTop()}
                onIndexChange={(index) => navigation.setParams({ index })}
                onFontSizeChange={handleSongFontSizeChange}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
