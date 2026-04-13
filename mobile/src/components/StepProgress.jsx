import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../constants/theme.js';

const STEP_LABELS = [
  'Opening Checklist',
  'Espresso Dial-in',
  'Inventory',
  'Cash Log',
  'Waste Log',
  'Closing Checklist',
  'Issues & Notes',
];

export function StepProgress({ current, total = 7 }) {
  const pct = (current / total) * 100;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.stepText}>Step {current} of {total}</Text>
        <Text style={styles.stepName}>{STEP_LABELS[current - 1]}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { marginBottom: spacing.base },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  stepText:   { fontSize: fontSize.sm, color: colors.textMuted },
  stepName:   { fontSize: fontSize.sm, fontWeight: '600', color: colors.secondary },
  track:      { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  fill:       { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
});
