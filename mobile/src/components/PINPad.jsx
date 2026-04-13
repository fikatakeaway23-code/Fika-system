import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, fontSize, shadow } from '../constants/theme.js';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
];

export function PINPad({ value, onChange, onConfirm }) {
  function press(key) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === 'del') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'ok') {
      if (value.length === 4) onConfirm?.();
      return;
    }
    if (value.length < 4) {
      onChange(value + key);
    }
  }

  return (
    <View style={styles.container}>
      {/* PIN dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>

      {/* Keypad */}
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.7}
              onPress={() => press(key)}
              style={[
                styles.key,
                key === 'del' && styles.keyDel,
                key === 'ok'  && styles.keyOk,
                key === 'ok' && value.length < 4 && styles.keyOkDisabled,
              ]}
            >
              <Text style={[
                styles.keyText,
                key === 'del' && styles.keyDelText,
                key === 'ok'  && styles.keyOkText,
              ]}>
                {key === 'del' ? '⌫' : key === 'ok' ? 'OK' : key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const KEY_SIZE = 88;

const styles = StyleSheet.create({
  container:   { width: '100%', alignItems: 'center' },
  dots:        { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing['2xl'] },
  dot:         { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  dotFilled:   { backgroundColor: colors.secondary },

  row:         { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  key: {
    width:           KEY_SIZE,
    height:          KEY_SIZE,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    ...shadow.sm,
  },
  keyDel:      { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  keyOk:       { backgroundColor: colors.primary, borderColor: colors.primary },
  keyOkDisabled: { opacity: 0.4 },

  keyText:     { fontSize: fontSize['3xl'], fontWeight: '600', color: colors.text },
  keyDelText:  { fontSize: fontSize.xl,    fontWeight: '600', color: colors.danger },
  keyOkText:   { fontSize: fontSize.md,    fontWeight: '700', color: colors.textInverse },
});
