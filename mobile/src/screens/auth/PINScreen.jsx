import React, { useState, useRef } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, Animated, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { PINPad } from '../../components/PINPad.jsx';
import { useAuthStore } from '../../stores/auth.store.js';
import { scheduleShiftReminders } from '../../lib/notifications.js';
import { colors, spacing, radius, fontSize } from '../../constants/theme.js';

export function PINScreen({ route, navigation }) {
  const { role, name, initials, color } = route.params;
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const login     = useAuthStore((s) => s.login);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleConfirm() {
    if (pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const user = await login(role, pin);
      await scheduleShiftReminders(user.role);
    } catch (err) {
      setPin('');
      setError('Incorrect PIN. Please try again.');
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.prompt}>Enter your 4-digit PIN</Text>

        {/* Shake wrapper for the PIN pad */}
        <Animated.View style={{ width: '100%', transform: [{ translateX: shakeAnim }] }}>
          <PINPad value={pin} onChange={setPin} onConfirm={handleConfirm} />
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading && <ActivityIndicator style={{ marginTop: spacing.base }} color={colors.primary} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  back:    { padding: spacing.base, paddingTop: spacing.lg },
  backText:{ fontSize: fontSize.md, color: colors.secondary, fontWeight: '600' },

  container: {
    flex:           1,
    alignItems:     'center',
    paddingHorizontal: spacing.xl,
    paddingTop:     spacing.xl,
  },
  avatar:   { width: 80, height: 80, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base },
  initials: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.textInverse },
  name:     { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: 6 },
  prompt:   { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing['2xl'] },
  error:    { marginTop: spacing.base, fontSize: fontSize.sm, color: colors.danger, fontWeight: '600' },
});
