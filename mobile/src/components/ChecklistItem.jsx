import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, fontSize } from '../constants/theme.js';

export function ChecklistItem({ label, checked, onToggle }) {
  function handle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle?.();
  }

  return (
    <TouchableOpacity
      onPress={handle}
      activeOpacity={0.8}
      style={[styles.row, checked && styles.rowChecked]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        spacing.md,
    marginBottom:   spacing.sm,
    minHeight:      48,
  },
  rowChecked: { backgroundColor: colors.successBg },

  box: {
    width:        22,
    height:       22,
    borderRadius: 5,
    borderWidth:  2,
    borderColor:  colors.border,
    backgroundColor: colors.background,
    alignItems:   'center',
    justifyContent: 'center',
    marginRight:  spacing.md,
    flexShrink:   0,
  },
  boxChecked:    { backgroundColor: colors.primary, borderColor: colors.primary },
  check:         { color: colors.textInverse, fontSize: 13, fontWeight: '700' },

  label:         { flex: 1, fontSize: fontSize.base, color: colors.text },
  labelChecked:  { color: colors.textMuted, textDecorationLine: 'line-through' },
});
