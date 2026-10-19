import React, { useState } from 'react';
import * as Location from 'expo-location';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import DateTimeField from '../components/DateTimeField';
import { hasMapTarget, openInMaps } from '../lib/maps';
import { theme } from '../theme';
import type { SetlistGroup, SetlistWithSongs } from '../types';

type SetlistDetailsScreenProps = {
  setlist: SetlistWithSongs;
  groups: SetlistGroup[];
  onCreateGroup: (name: string) => SetlistGroup;
  onCancel: () => void;
  onSave: (
    name: string,
    details: {
      location: string;
      latitude: number | null;
      longitude: number | null;
      date: string;
      time: string;
      groupId: string | null;
    },
  ) => void;
};

export default function SetlistDetailsScreen({
  setlist,
  groups,
  onCreateGroup,
  onCancel,
  onSave,
}: SetlistDetailsScreenProps) {
  const [name, setName] = useState(setlist.name);
  const [location, setLocation] = useState(setlist.location ?? '');
  const [latitude, setLatitude] = useState<number | null>(setlist.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(setlist.longitude ?? null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [date, setDate] = useState(setlist.date ?? '');
  const [time, setTime] = useState(setlist.time ?? '');
  const [groupId, setGroupId] = useState<string | null>(setlist.group_id ?? null);

  const hasPin = latitude !== null && longitude !== null;

  const showLocationError = (error: unknown) =>
    Alert.alert(
      'Location unavailable',
      error instanceof Error ? error.message : 'An unexpected error occurred.',
    );

  const useCurrentLocation = async () => {
    setLocationBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Location permission was not granted. You can still type the location.');
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      if (!location.trim()) {
        const [place] = await Location.reverseGeocodeAsync(position.coords).catch(() => []);
        const label = place
          ? [place.name, place.street, place.city].filter(Boolean).join(', ')
          : '';
        setLocation(label || `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
      }
    } catch (error) {
      showLocationError(error);
    } finally {
      setLocationBusy(false);
    }
  };

  const findTypedLocation = async () => {
    if (!location.trim()) {
      return;
    }
    setLocationBusy(true);
    try {
      const [match] = await Location.geocodeAsync(location.trim());
      if (!match) {
        throw new Error('No map position was found for that text.');
      }
      setLatitude(match.latitude);
      setLongitude(match.longitude);
    } catch (error) {
      showLocationError(error);
    } finally {
      setLocationBusy(false);
    }
  };

  const save = () => {
    if (!name.trim()) {
      return;
    }
    try {
      let resolvedGroupId = groupId;
      if (creatingGroup && newGroupName.trim()) {
        resolvedGroupId = onCreateGroup(newGroupName).id;
      }
      onSave(name, { location, latitude, longitude, date, time, groupId: resolvedGroupId });
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            placeholder="Setlist name"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Setlist name"
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            returnKeyType="next"
            placeholder="Venue or address (optional)"
            placeholderTextColor={theme.colors.text_secondary}
            style={styles.input}
            accessibilityLabel="Setlist location"
          />
          <View style={styles.groupOptions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use current location"
              disabled={locationBusy}
              onPress={useCurrentLocation}
              style={styles.groupChoice}
            >
              <Text style={styles.groupChoiceText}>Use current location</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find typed location on map"
              disabled={locationBusy || !location.trim()}
              onPress={findTypedLocation}
              style={[styles.groupChoice, !location.trim() && styles.disabledButton]}
            >
              <Text style={styles.groupChoiceText}>Find on map</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open in Maps"
              disabled={!hasMapTarget({ location, latitude, longitude })}
              onPress={() =>
                openInMaps({ location, latitude, longitude }).catch(showLocationError)
              }
              style={[
                styles.groupChoice,
                !hasMapTarget({ location, latitude, longitude }) && styles.disabledButton,
              ]}
            >
              <Text style={styles.groupChoiceText}>Open in Maps</Text>
            </Pressable>
          </View>
          {hasPin && (
            <View style={styles.pinRow}>
              <Text style={styles.pinText}>
                Map position saved ({latitude.toFixed(5)}, {longitude.toFixed(5)})
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear map position"
                onPress={() => {
                  setLatitude(null);
                  setLongitude(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.pinClear}>Clear</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Date</Text>
              <DateTimeField
                mode="date"
                value={date}
                onChange={setDate}
                accessibilityLabel="Setlist date"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Time</Text>
              <DateTimeField
                mode="time"
                value={time}
                onChange={setTime}
                accessibilityLabel="Setlist time"
              />
            </View>
          </View>

          <Text style={styles.label}>Group</Text>
          <View style={styles.groupOptions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: groupId === null }}
              onPress={() => {
                setGroupId(null);
                setCreatingGroup(false);
              }}
              style={[styles.groupChoice, groupId === null && styles.groupChoiceSelected]}
            >
              <Text style={[styles.groupChoiceText, groupId === null && styles.selectedText]}>
                No group
              </Text>
            </Pressable>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected: groupId === group.id }}
                onPress={() => {
                  setGroupId(group.id);
                  setCreatingGroup(false);
                }}
                style={[
                  styles.groupChoice,
                  groupId === group.id && styles.groupChoiceSelected,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.groupChoiceText, groupId === group.id && styles.selectedText]}
                >
                  {group.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add group"
              accessibilityState={{ selected: creatingGroup }}
              onPress={() => setCreatingGroup((creating) => !creating)}
              style={[styles.groupChoice, creatingGroup && styles.groupChoiceSelected]}
            >
              <Text style={[styles.groupChoiceText, creatingGroup && styles.selectedText]}>
                + New group
              </Text>
            </Pressable>
          </View>
          {creatingGroup && (
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              returnKeyType="done"
              placeholder="New group name"
              placeholderTextColor={theme.colors.text_secondary}
              style={styles.input}
              accessibilityLabel="New group name"
            />
          )}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={!name.trim()}
            style={[styles.saveButton, !name.trim() && styles.disabledButton]}
          >
            <Text style={styles.saveText}>Save setlist</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
    gap: 8,
  },
  label: {
    color: theme.colors.text_secondary,
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    color: theme.colors.text_primary,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pinText: {
    flex: 1,
    color: theme.colors.text_secondary,
    fontSize: 13,
  },
  pinClear: {
    color: theme.colors.accent_highlight,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    gap: 8,
  },
  groupOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  groupChoice: {
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupChoiceSelected: {
    borderColor: theme.colors.accent_highlight,
    backgroundColor: theme.colors.surface_card,
  },
  groupChoiceText: {
    color: theme.colors.text_secondary,
    fontSize: 14,
  },
  selectedText: {
    color: theme.colors.accent_highlight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border_contrast,
    backgroundColor: theme.colors.background,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    color: theme.colors.text_secondary,
    fontSize: 15,
  },
  saveButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.accent_highlight,
    paddingHorizontal: 18,
  },
  saveText: {
    color: theme.colors.background,
    fontWeight: theme.typography.font_weight_bold,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
