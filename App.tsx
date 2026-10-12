import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import LivePerformanceScreen from './src/screens/LivePerformanceScreen';
import SongEditorScreen from './src/screens/SongEditorScreen';
import { initializeDatabase, getSetlistsWithSongs, saveSongForSetlist, createSetlist, type SetlistWithSongs, type Song } from './src/lib/db';
import { theme } from './src/theme';

type Screen = 'dashboard' | 'editor' | 'performance';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [setlists, setSetlists] = useState<SetlistWithSongs[]>([]);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSetlists = () => {
    setSetlists(getSetlistsWithSongs());
  };

  useEffect(() => {
    initializeDatabase();
    refreshSetlists();
    setIsReady(true);
  }, []);

  const openDashboard = () => {
    setSelectedSetlistId(null);
    setSelectedSong(null);
    setScreen('dashboard');
    refreshSetlists();
  };

  const openSongEditor = (setlistId: string, song?: Song | null) => {
    setSelectedSetlistId(setlistId);
    setSelectedSong(song ?? null);
    setScreen('editor');
  };

  const openPerformance = (song: Song) => {
    setSelectedSong(song);
    setScreen('performance');
  };

  const handleCreateSetlist = (name: string) => {
    const createdSetlist = createSetlist(name);
    setSelectedSetlistId(createdSetlist.id);
    refreshSetlists();
    setScreen('editor');
  };

  const handleSaveSong = ({ title, notesRawText }: { title: string; notesRawText: string }) => {
    if (!selectedSetlistId) {
      return;
    }

    const savedSong = saveSongForSetlist({
      setlistId: selectedSetlistId,
      songId: selectedSong?.id,
      title,
      notes_raw_text: notesRawText,
    });

    setSelectedSong(savedSong);
    refreshSetlists();
    setScreen('dashboard');
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.accent_highlight} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {screen === 'dashboard' && (
        <DashboardScreen
          setlists={setlists}
          onCreateSetlist={handleCreateSetlist}
          onOpenSongForEdit={openSongEditor}
          onOpenPerformance={openPerformance}
          onOpenNewSong={(setlistId) => openSongEditor(setlistId, null)}
        />
      )}

      {screen === 'editor' && selectedSetlistId && (
        <SongEditorScreen
          setlistId={selectedSetlistId}
          initialSong={selectedSong ?? undefined}
          onCancel={openDashboard}
          onSave={handleSaveSong}
          onPlay={openPerformance}
        />
      )}

      {screen === 'performance' && selectedSong && (
        <LivePerformanceScreen song={selectedSong} onBack={openDashboard} />
      )}
    </>
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
