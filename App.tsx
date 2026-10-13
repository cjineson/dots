import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';
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
  copySetlist,
  copySongToSetlist,
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

export default function App() {
  const [setlists, setSetlists] = useState<SetlistWithSongs[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);

  const refreshSetlists = () => {
    setSetlists(getSetlistsWithSongs());
  };

  useEffect(() => {
    try {
      initializeDatabase();
      refreshSetlists();
      setStartupError(null);
    } catch (error) {
      setStartupError(
        error instanceof Error ? error.message : 'An unexpected startup error occurred.',
      );
      console.error('GigBox failed to initialize its local database.', error);
    }

    setIsReady(true);
  }, [startupAttempt]);

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

  const handleCopySetlist = (setlistId: string) => {
    copySetlist(setlistId);
    refreshSetlists();
  };

  const handleCopySong = (songId: string, targetSetlistId: string) => {
    copySongToSetlist(songId, targetSetlistId);
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
    return null;
  }

  if (startupError) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.startupErrorContainer}>
          <Text style={styles.startupErrorTitle}>GigBox couldn’t start</Text>
          <Text style={styles.startupErrorMessage}>{startupError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsReady(false);
              setStartupAttempt((attempt) => attempt + 1);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
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
                onCopySetlist={handleCopySetlist}
                onCopySong={handleCopySong}
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
    backgroundColor: theme.colors.background,
  },
  startupErrorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  startupErrorTitle: {
    color: theme.colors.text_primary,
    fontSize: 20,
    fontWeight: theme.typography.font_weight_bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  startupErrorMessage: {
    color: theme.colors.text_secondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: theme.colors.accent_highlight,
    fontWeight: theme.typography.font_weight_bold,
  },
});
