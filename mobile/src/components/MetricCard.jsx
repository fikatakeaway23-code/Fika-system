import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, shadow } from '../constants/theme.js';

export function MetricCard({ label, value, sub, accent = false, style }) {
  return (
    <View style={[styles.card, accent && styles.cardAccent, shadow.sm, style]}>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {sub ? <Text style={[styles.sub, accent && styles.subAccent]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
    flex:            1,
  },
  cardAccent: {
    backgroundColor: colors.secondary,
    borderColor:     colors.secondary,
  },
  label:       { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelAccent: { color: 'rgba(255,255,255,0.8)' },
  value:       { fontSize: fontSize['3xl'], fontWeight: '700', color: colors.text },
  valueAccent: { color: colors.background },
  sub:         { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  subAccent:   { color: colors.primaryLight },
});
