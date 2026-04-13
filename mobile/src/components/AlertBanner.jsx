import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize } from '../constants/theme.js';

const VARIANTS = {
  danger:  { bg: colors.dangerBg,  border: colors.danger,  accent: colors.danger,  titleColor: '#C53030', textColor: '#742A2A' },
  warning: { bg: colors.warningBg, border: colors.warning, accent: colors.warning, titleColor: '#C05621', textColor: '#7B341E' },
  success: { bg: colors.successBg, border: colors.primary, accent: colors.primary, titleColor: '#276749', textColor: '#22543D' },
};

export function AlertBanner({ variant = 'danger', title, message, onPress, style }) {
  const v = VARIANTS[variant] ?? VARIANTS.danger;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} style={[styles.banner, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <View style={[styles.accent, { backgroundColor: v.accent }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: v.titleColor }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: v.textColor }]}>{message}</Text> : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.lg,
    borderWidth:  1.5,
    flexDirection:'row',
    overflow:     'hidden',
    marginBottom: spacing.sm,
  },
  accent:  { width: 4, backgroundColor: colors.danger },
  content: { flex: 1, padding: spacing.md, paddingLeft: spacing.base },
  title:   { fontSize: fontSize.sm, fontWeight: '700', marginBottom: 2 },
  message: { fontSize: fontSize.xs },
});
