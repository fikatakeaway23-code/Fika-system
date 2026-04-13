import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus.js';
import { colors } from '../constants/theme.js';

export function NetworkIndicator() {
  const isOnline = useNetworkStatus();
  return <View style={[styles.dot, isOnline ? styles.online : styles.offline]} />;
}

const styles = StyleSheet.create({
  dot:     { width: 10, height: 10, borderRadius: 5 },
  online:  { backgroundColor: colors.primary },
  offline: { backgroundColor: colors.danger },
});
