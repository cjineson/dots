import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './src/screens/DashboardScreen';
import FlowScreen from './src/screens/FlowScreen';
import GroupEditorScreen from './src/screens/GroupEditorScreen';
import LivePerformanceScreen from './src/screens/LivePerformanceScreen';
import SetlistDetailsScreen from './src/screens/SetlistDetailsScreen';
import SongEditorScreen from './src/screens/SongEditorScreen';
import {
  clearAllLibraryData,
  copySetlist,
  copySongToSetlist,
  createBreakForSetlist,
  createSetlist,
  createSetlistGroup,
  deleteSetlistGroup,
  deleteBreakFromSetlist,
  deleteSongPermanently,
  deleteSongFromSetlist,
  deleteSetlist,
  getAppSettings,
  getDashboardExpansionState,
  getSetlistGroups,
  getTagSize,
  getThemePreference,
  getSetlistsWithSongs,
  getStandaloneSongs,
  reorderSetlistSiblings,
  importSetlists,
  initializeDatabase,
  renameSetlist,
  renameSetlistGroup,
  resetAppSettings,
  saveAppSetting,
  updateSetlistNotes,
  reorderItemsForSetlist,
  saveDashboardExpansionState,
  saveSongForSetlist,
  saveTagSize,
  saveThemePreference,
  updateSongCueContent,
  updateSongFontSize,
} from './src/lib/db';
import { DEFAULT_SETTINGS, needsBackupReminder } from './src/lib/settings';
import type { AppSettings } from './src/lib/settings';
import { findImportConflicts, selectArchiveContent } from './src/lib/archiveSelection';
import type { ExportSelection } from './src/lib/archiveSelection';
import { createSetlistArchive, parseSetlistArchive } from './src/lib/setlistArchive';
import { getCommonSongTags } from './src/lib/songTags';
import { decodeTextFile } from './src/lib/textEncoding';
import { clampTagSize, DEFAULT_TAG_SIZE } from './src/lib/fontSize';
import { resolveTheme, ThemeProvider } from './src/themeContext';
import type { ThemePreference } from './src/themeContext';
import ExportScreen from './src/screens/ExportScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import type { AppTheme } from './src/theme';
import type {
  DashboardExpansionState,
  SetlistGroup,
  SetlistHeaderDetails,
  SetlistItem,
  Song,
  SongTag,
  SetlistWithSongs,
} from './src/types';

type RootStackParamList = {
  Dashboard: undefined;
  Settings: undefined;
  Export: undefined;
  Editor: { setlistId?: string; song?: Song };
  SetlistDetails: { setlistId: string; isNew?: boolean };
  GroupEditor: { groupId?: string };
  Performance: {
    items: SetlistItem[];
    index: number;
    isEditorPreview?: boolean;
  };
  Flow: { setlistId: string; setlistName: string; setlistDetails?: string; items: SetlistItem[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function formatSetlistDetails(setlist: SetlistHeaderDetails | undefined): string | undefined {
  if (!setlist) {
    return undefined;
  }
  const details = [setlist.location, setlist.date, setlist.time]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return details.length > 0 ? details.join(' · ') : undefined;
}

export default function App() {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('dark');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const theme = resolveTheme(themePreference, systemScheme, settings.highContrast, settings.palette);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [setlists, setSetlists] = useState<SetlistWithSongs[]>([]);
  const [standaloneSongs, setStandaloneSongs] = useState<Song[]>([]);
  const [groups, setGroups] = useState<SetlistGroup[]>([]);
  const [dashboardExpansion, setDashboardExpansion] = useState<DashboardExpansionState>({
    expandedSetlists: {},
    collapsedGroups: {},
  });
  const [isReady, setIsReady] = useState(false);
  const [tagSize, setTagSize] = useState(DEFAULT_TAG_SIZE);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const commonSongTags = getCommonSongTags(setlists, standaloneSongs);

  const refreshSetlists = () => {
    setSetlists(getSetlistsWithSongs());
    setStandaloneSongs(getStandaloneSongs());
    setGroups(getSetlistGroups());
  };

  useEffect(() => {
    try {
      initializeDatabase();
      refreshSetlists();
      setDashboardExpansion(getDashboardExpansionState());
      setTagSize(getTagSize());
      setThemePreference(getThemePreference());
      setSettings(getAppSettings());
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
    setlistId: string | undefined,
    existingSong: Song | undefined,
    {
      title,
      notesRawText,
      cueDocument,
      tags,
      fontSize,
    }: {
      title: string;
      notesRawText: string;
      cueDocument: string;
      tags: Song['tags'];
      fontSize?: number;
    },
    onSaved: () => void,
  ) => {
    saveSongForSetlist({
      setlistId,
      songId: existingSong?.id,
      title,
      notes_raw_text: notesRawText,
      cue_document: cueDocument,
      tags,
      font_size: fontSize,
    });

    refreshSetlists();
    onSaved();
  };

  const handleReorderItems = (setlistId: string, items: SetlistItem[]) => {
    reorderItemsForSetlist(setlistId, items);
    refreshSetlists();
  };

  const handleRenameSetlist = (
    setlistId: string,
    name: string,
    details: {
      location?: string;
      latitude?: number | null;
      longitude?: number | null;
      notes?: string;
      date?: string;
      time?: string;
      groupId?: string | null;
    },
  ) => {
    renameSetlist(setlistId, name, details);
    refreshSetlists();
  };

  const handleReorderSetlists = (orderedIds: string[]) => {
    reorderSetlistSiblings(orderedIds);
    refreshSetlists();
  };

  const handleCreateSetlistGroup = (name: string) => {
    const group = createSetlistGroup(name);
    refreshSetlists();
    return group;
  };

  const handleRenameSetlistGroup = (groupId: string, name: string) => {
    renameSetlistGroup(groupId, name);
    refreshSetlists();
  };

  const handleDeleteSetlistGroup = (groupId: string) => {
    deleteSetlistGroup(groupId);
    refreshSetlists();
  };

  const handleThemePreferenceChange = (preference: ThemePreference) => {
    saveThemePreference(preference);
    setThemePreference(preference);
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    saveAppSetting(key, value);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleResetSettings = () => {
    resetAppSettings();
    setSettings(getAppSettings());
    setTagSize(getTagSize());
    setThemePreference(getThemePreference());
  };

  const handleClearAllData = () => {
    clearAllLibraryData();
    setDashboardExpansion(getDashboardExpansionState());
    refreshSetlists();
  };

  const handleToggleSetlistNotes = (setlistId: string, notes: string) => {
    updateSetlistNotes(setlistId, notes);
    refreshSetlists();
  };

  const handleTagSizeChange = (size: number, persist: boolean) => {
    const bounded = clampTagSize(size);
    setTagSize(bounded);
    if (persist) {
      saveTagSize(bounded);
    }
  };

  const handleDashboardExpansionChange = (state: DashboardExpansionState) => {
    saveDashboardExpansionState(state);
    setDashboardExpansion(state);
  };

  const expandDashboardSetlist = (setlistId: string, groupId?: string | null) => {
    const collapsedGroups = { ...dashboardExpansion.collapsedGroups };
    if (groupId) {
      delete collapsedGroups[groupId];
    }
    handleDashboardExpansionChange({
      ...dashboardExpansion,
      expandedSetlists: {
        ...dashboardExpansion.expandedSetlists,
        [setlistId]: true,
      },
      collapsedGroups,
    });
  };

  const handleDeleteSetlist = (setlistId: string) => {
    deleteSetlist(setlistId);
    refreshSetlists();
  };

  const handleCopySetlist = (setlistId: string) => {
    copySetlist(setlistId);
    refreshSetlists();
  };

  const handleCopySong = (songId: string, targetSetlistId: string, variantTag?: SongTag) => {
    copySongToSetlist(songId, targetSetlistId, variantTag);
    refreshSetlists();
  };

  const handleSongFontSizeChange = (songId: string, fontSize: number) => {
    updateSongFontSize(songId, fontSize);
    refreshSetlists();
  };

  const handleSongCueContentChange = (
    songId: string,
    notesRawText: string,
    cueDocument: string,
  ) => {
    updateSongCueContent(songId, notesRawText, cueDocument);
    refreshSetlists();
  };

  const handleExportSelection = async (selection: ExportSelection, onDone: () => void) => {
    try {
      const content = selectArchiveContent(setlists, groups, selection, standaloneSongs);
      if (content.setlists.length === 0 && content.groups.length === 0 && content.songs.length === 0) {
        Alert.alert('Nothing to export', 'Select at least one group, setlist or song.');
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('File sharing is not available on this device.');
      }
      if (!FileSystem.cacheDirectory) {
        throw new Error('The temporary file directory is not available.');
      }

      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const fileUri = `${FileSystem.cacheDirectory}gigbox-library-${timestamp}.json`;
      const archive = createSetlistArchive(content.setlists, content.groups, content.songs);
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(archive, null, 2));
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export GigBox library',
        UTI: 'public.json',
      });
      // Only a full export counts as a backup for the reminder.
      const exportedEverything =
        content.groups.length === groups.length &&
        content.setlists.length === setlists.length &&
        content.songs.length === standaloneSongs.length &&
        standaloneSongs.every((song) => content.songs.some((item) => item.id === song.id)) &&
        !content.setlists.some((setlist) => setlist.partial) &&
        setlists.every((setlist) => content.setlists.some((item) => item.id === setlist.id));
      if (exportedEverything) {
        handleSettingChange('lastExportAt', new Date().toISOString());
      }
      onDone();
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

      const json = decodeTextFile(await new File(result.assets[0].uri).bytes());
      const importedLibrary = parseSetlistArchive(json);
      const conflicts = findImportConflicts(importedLibrary, setlists, standaloneSongs);
      const finishImport = (mode: 'copy' | 'replace') => {
        try {
          importSetlists(importedLibrary, mode);
          refreshSetlists();
          Alert.alert('Import', 'Import complete.');
        } catch (error) {
          setImportError(error instanceof Error ? error.message : String(error));
        }
      };
      if (conflicts.setlists.length === 0 && conflicts.songs.length === 0) {
        finishImport('copy');
        return;
      }
      const names = [...conflicts.setlists, ...conflicts.songs];
      const listed = names.slice(0, 5).map((name) => `• ${name}`).join('\n');
      const more = names.length > 5 ? `\n…and ${names.length - 5} more` : '';
      Alert.alert(
        'Import will overwrite changes',
        `These items already exist and would be replaced, losing any edits made here since they were exported:\n${listed}${more}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add as copies', onPress: () => finishImport('copy') },
          { text: 'Replace', style: 'destructive', onPress: () => finishImport('replace') },
        ],
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyImportError = async () => {
    if (!importError) {
      return;
    }

    try {
      await Clipboard.setStringAsync(importError);
      Alert.alert('Copied', 'The import error has been copied to the clipboard.');
    } catch (error) {
      Alert.alert(
        'Copy failed',
        error instanceof Error ? error.message : 'Could not copy the import error.',
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
    <ThemeProvider value={theme}>
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer
        theme={{
          ...(theme.mode === 'light' ? DefaultTheme : DarkTheme),
          colors: {
            ...(theme.mode === 'light' ? DefaultTheme : DarkTheme).colors,
            background: theme.colors.background,
            card: theme.colors.background,
            text: theme.colors.text_primary,
            border: theme.colors.border_contrast,
            primary: theme.colors.accent_highlight,
          },
        }}
      >
        <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
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
                standaloneSongs={standaloneSongs}
                groups={groups}
                expansionState={dashboardExpansion}
                onExpansionStateChange={handleDashboardExpansionChange}
                onCreateSetlist={(groupId) => {
                  const created = createSetlist('New Setlist', groupId);
                  expandDashboardSetlist(created.id, groupId);
                  refreshSetlists();
                  navigation.navigate('SetlistDetails', { setlistId: created.id, isNew: true });
                }}
                onOpenGroupEditor={(group) =>
                  navigation.navigate('GroupEditor', { groupId: group?.id })
                }
                onDeleteGroup={handleDeleteSetlistGroup}
                onOpenSetlistEditor={(setlist) =>
                  navigation.navigate('SetlistDetails', { setlistId: setlist.id })
                }
                onDeleteSetlist={handleDeleteSetlist}
                onCopySetlist={handleCopySetlist}
                onCopySong={handleCopySong}
                onDeleteSong={(setlistId, songId) => {
                  deleteSongFromSetlist(setlistId, songId);
                  refreshSetlists();
                }}
                onDeleteSongPermanently={(songId) => {
                  deleteSongPermanently(songId);
                  refreshSetlists();
                }}
                onDeleteBreak={(setlistId, breakId) => {
                  deleteBreakFromSetlist(setlistId, breakId);
                  refreshSetlists();
                }}
                onCreateBreak={(setlistId, durationMinutes) => {
                  createBreakForSetlist(setlistId, durationMinutes);
                  refreshSetlists();
                }}
                onOpenFlow={(setlist) =>
                  navigation.navigate('Flow', {
                    setlistId: setlist.id,
                    setlistName: setlist.name,
                    setlistDetails: formatSetlistDetails(setlist),
                    items: setlist.items,
                  })
                }
                onOpenSongForEdit={(setlistId, song) =>
                  navigation.navigate('Editor', { setlistId, song })
                }
                onCreateSong={() => navigation.navigate('Editor', {})}
                onOpenPerformance={(items, index) =>
                  navigation.navigate('Performance', {
                    items,
                    index,
                  })
                }
                onOpenNewSong={(setlistId) => navigation.navigate('Editor', { setlistId })}
                onReorderSetlists={handleReorderSetlists}
                onReorderItems={handleReorderItems}
                onOpenSettings={() => navigation.navigate('Settings')}
                backupReminder={needsBackupReminder(
                  settings.lastExportAt,
                  setlists.length > 0 || standaloneSongs.length > 0,
                  settings.backupSnoozedUntil,
                )}
                onSnoozeBackupReminder={(days) =>
                  handleSettingChange(
                    'backupSnoozedUntil',
                    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
                  )
                }
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
            {({ navigation }) => (
              <SettingsScreen
                themePreference={themePreference}
                onThemePreferenceChange={handleThemePreferenceChange}
                onExportLibrary={() => navigation.navigate('Export')}
                onImportLibrary={handleImportLibrary}
                settings={settings}
                onSettingChange={handleSettingChange}
                tagSize={tagSize}
                onTagSizeChange={handleTagSizeChange}
                onResetSettings={handleResetSettings}
                onClearAllData={handleClearAllData}
                hasData={setlists.length > 0 || standaloneSongs.length > 0}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Export" options={{ title: 'Export' }}>
            {({ navigation }) => (
              <ExportScreen
                setlists={setlists}
                standaloneSongs={standaloneSongs}
                groups={groups}
                onExport={(selection) =>
                  void handleExportSelection(selection, () => navigation.goBack())
                }
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SetlistDetails"
            options={{ title: 'Edit Setlist' }}
          >
            {({ navigation, route }) => {
              const setlist = setlists.find((item) => item.id === route.params.setlistId);
              if (!setlist) {
                return (
                  <SafeAreaView style={styles.startupErrorContainer}>
                    <Text style={styles.startupErrorMessage}>This setlist could not be found.</Text>
                    <Pressable onPress={() => navigation.goBack()} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Back</Text>
                    </Pressable>
                  </SafeAreaView>
                );
              }
              return (
                <SetlistDetailsScreen
                  setlist={setlist}
                  isNew={route.params.isNew}
                  groups={groups}
                  onCreateGroup={handleCreateSetlistGroup}
                  onCancel={() => navigation.goBack()}
                  onSave={(name, details) => {
                    handleRenameSetlist(setlist.id, name, details);
                    navigation.goBack();
                  }}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="GroupEditor"
            options={({ route }) => ({
              title: route.params.groupId ? 'Edit Group' : 'New Group',
            })}
          >
            {({ navigation, route }) => {
              const group = route.params.groupId
                ? groups.find((item) => item.id === route.params.groupId)
                : undefined;
              if (route.params.groupId && !group) {
                return (
                  <SafeAreaView style={styles.startupErrorContainer}>
                    <Text style={styles.startupErrorMessage}>This group could not be found.</Text>
                    <Pressable onPress={() => navigation.goBack()} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Back</Text>
                    </Pressable>
                  </SafeAreaView>
                );
              }
              return (
                <GroupEditorScreen
                  group={group}
                  onCancel={() => navigation.goBack()}
                  onSave={(name) => {
                    if (group) {
                      handleRenameSetlistGroup(group.id, name);
                    } else {
                      handleCreateSetlistGroup(name);
                    }
                    navigation.goBack();
                  }}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="Flow"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            {({ navigation, route }) => {
              const flowSetlist = setlists.find((item) => item.id === route.params.setlistId);
              return (
              <FlowScreen
                setlistId={route.params.setlistId}
                setlistName={route.params.setlistName}
                setlistDetails={route.params.setlistDetails}
                notes={flowSetlist?.notes}
                onNotesChange={handleToggleSetlistNotes}
                settings={settings}
                onSettingChange={handleSettingChange}
                items={route.params.items}
                onGoToDashboard={() => navigation.popToTop()}
                onOpenSettings={() => navigation.navigate('Settings')}
                onSaveCueContent={handleSongCueContentChange}
                onFontSizeChange={handleSongFontSizeChange}
                tagSize={tagSize}
                onTagSizeChange={handleTagSizeChange}
              />
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="Editor"
            options={({ route }) => ({ title: route.params.song ? 'Edit Song' : 'New Song' })}
          >
            {({ navigation, route }) => (
              <SongEditorScreen
                initialSong={route.params.song}
                commonTags={commonSongTags}
                defaultFontSize={settings.defaultFontSize}
                onCancel={() => navigation.goBack()}
                onSave={(payload) =>
                  handleSaveSong(route.params.setlistId, route.params.song, payload, () =>
                    navigation.popToTop(),
                  )
                }
                onPlay={(song) => {
                  navigation.navigate('Performance', {
                    items: [{ kind: 'song', song }],
                    index: 0,
                    isEditorPreview: true,
                  });
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
                items={route.params.items}
                index={route.params.index}
                isEditorPreview={route.params.isEditorPreview}
                settings={settings}
                onSettingChange={handleSettingChange}
                onGoToDashboard={() => navigation.popToTop()}
                onOpenSettings={() => navigation.navigate('Settings')}
                onExitEditorPreview={() => navigation.goBack()}
                onIndexChange={(index) => navigation.setParams({ index })}
                onSaveCueContent={handleSongCueContentChange}
                onFontSizeChange={handleSongFontSizeChange}
                tagSize={tagSize}
                onTagSizeChange={handleTagSizeChange}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      <Modal
        animationType="fade"
        onRequestClose={() => setImportError(null)}
        transparent
        visible={importError !== null}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModal}>
            <Text style={styles.errorModalTitle}>Import failed</Text>
            <Text style={styles.errorModalHint}>
              Copy this message and send it with the JSON file details.
            </Text>
            <ScrollView style={styles.errorModalMessageContainer}>
              <Text selectable style={styles.errorModalMessage}>
                {importError}
              </Text>
            </ScrollView>
            <View style={styles.errorModalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setImportError(null)}
                style={styles.errorModalCloseButton}
              >
                <Text style={styles.errorModalCloseText}>Close</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleCopyImportError()}
                style={styles.errorModalCopyButton}
              >
                <Text style={styles.errorModalCopyText}>Copy error</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
  errorModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  errorModal: {
    maxHeight: '80%',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border_contrast,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  errorModalTitle: {
    color: theme.colors.text_primary,
    fontSize: 20,
    fontWeight: theme.typography.font_weight_bold,
    marginBottom: 8,
  },
  errorModalHint: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginBottom: 16,
  },
  errorModalMessageContainer: {
    flexShrink: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  errorModalMessage: {
    color: theme.colors.text_primary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  errorModalCloseButton: {
    borderColor: theme.colors.border_contrast,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorModalCloseText: {
    color: theme.colors.text_primary,
    fontWeight: theme.typography.font_weight_bold,
  },
  errorModalCopyButton: {
    backgroundColor: theme.colors.accent_highlight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorModalCopyText: {
    color: theme.colors.background,
    fontWeight: theme.typography.font_weight_bold,
  },
});
