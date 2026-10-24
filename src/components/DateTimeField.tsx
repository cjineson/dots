import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { theme } from '../theme';
import {
  formatDateValue,
  formatTimeValue,
  parseDateValue,
  parseTimeValue,
} from '../lib/dateTime';

type DateTimeFieldProps = {
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

export default function DateTimeField({
  mode,
  value,
  onChange,
  accessibilityLabel,
}: DateTimeFieldProps) {
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const current = mode === 'date' ? parseDateValue(value) : parseTimeValue(value);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    onChange(mode === 'date' ? formatDateValue(selected) : formatTimeValue(selected));
  };

  if (Platform.OS === 'web') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
        placeholderTextColor={theme.colors.text_secondary}
        style={styles.field}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        onChange: handleChange,
      });
    } else {
      setIosPickerOpen((isOpen) => !isOpen);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={open}
          style={[styles.field, styles.fieldButton]}
        >
          <Text style={value ? styles.valueText : styles.placeholderText}>
            {value || (mode === 'date' ? 'Pick a date' : 'Pick a time')}
          </Text>
        </Pressable>
        {!!value && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${mode}`}
            onPress={() => {
              setIosPickerOpen(false);
              onChange('');
            }}
            hitSlop={8}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>
      {Platform.OS === 'ios' && iosPickerOpen && (
        <DateTimePicker
          value={current}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          themeVariant="dark"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    color: theme.colors.text_primary,
    backgroundColor: theme.colors.surface_card,
    borderWidth: 1,
    borderColor: theme.colors.border_contrast,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  fieldButton: {
    flex: 1,
  },
  valueText: {
    color: theme.colors.text_primary,
  },
  placeholderText: {
    color: theme.colors.text_secondary,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    color: theme.colors.text_secondary,
    fontSize: 16,
  },
});
