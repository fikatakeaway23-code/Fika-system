import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../../stores/auth.store.js';
import { authApi } from '../../lib/api.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const ROLE_META = {
  barista_am: { label: 'Barista 1', shift: 'Morning Shift', hours: '6:00 AM – 2:00 PM', color: colors.primary },
  barista_pm: { label: 'Barista 2', shift: 'Afternoon Shift', hours: '12:00 PM – 8:00 PM', color: colors.primary },
  owner:      { label: 'Owner',     shift: 'Full Access',    hours: 'All Hours',           color: colors.secondary },
};

export function ProfileScreen() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const meta = ROLE_META[user?.role] ?? ROLE_META.barista_am;
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  const [showPin, setShowPin]       = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError]     = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  async function handleChangePin() {
    setPinError('');
    if (currentPin.length !== 4) { setPinError('Current PIN must be 4 digits.'); return; }
    if (newPin.length !== 4)     { setPinError('New PIN must be 4 digits.'); return; }
    if (newPin !== confirmPin)   { setPinError('New PINs do not match.'); return; }

    setPinLoading(true);
    try {
      await authApi.changePin({ role: user.role, currentPin, newPin });
      setPinSuccess(true);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      setShowPin(false);
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err) {
      setPinError(err?.response?.data?.message ?? 'Failed to change PIN.');
    } finally {
      setPinLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Profile</Text>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: meta.color }]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? meta.label}</Text>
          <Text style={styles.role}>{meta.shift}</Text>
          <View style={styles.hoursBadge}>
            <Text style={styles.hoursText}>{meta.hours}</Text>
          </View>
        </View>

        {pinSuccess && <AlertBanner variant="success" message="PIN changed successfully!" />}

        {/* Change PIN */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowPin(!showPin)}>
            <Text style={styles.sectionTitle}>Change PIN</Text>
            <Text style={styles.chevron}>{showPin ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showPin && (
            <View style={styles.pinForm}>
              {pinError ? <AlertBanner variant="danger" message={pinError} /> : null}

              <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />
              <PinField label="New PIN"     value={newPin}     onChange={setNewPin} />
              <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />

              <TouchableOpacity
                style={[styles.pinBtn, pinLoading && { opacity: 0.6 }]}
                onPress={handleChangePin}
                disabled={pinLoading}
              >
                <Text style={styles.pinBtnText}>{pinLoading ? 'Saving…' : 'Save New PIN'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <InfoRow label="Version"     value={`v${version}`} />
          <InfoRow label="Environment" value={process.env.EXPO_PUBLIC_API_URL ?? 'localhost:4000'} />
          <InfoRow label="Role"        value={user?.role ?? '—'} />
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PinField({ label, value, onChange }) {
  return (
    <View style={styles.pinGroup}>
      <Text style={styles.pinLabel}>{label}</Text>
      <TextInput
        style={styles.pinInput}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        placeholder="••••"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  scroll:  { padding: spacing.base, paddingBottom: spacing['3xl'] },
  heading: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: spacing.xl, paddingTop: spacing.md },

  avatarCard: {
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    padding:         spacing.xl,
    marginBottom:    spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
    ...shadow.sm,
  },
  avatar:    { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  initials:  { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.textInverse },
  name:      { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: 4 },
  role:      { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  hoursBadge:{ backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.full },
  hoursText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.secondary },

  section: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    marginBottom:    spacing.base,
    overflow:        'hidden',
    ...shadow.sm,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        spacing.base,
  },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  chevron:      { fontSize: 12, color: colors.textMuted },

  pinForm:  { padding: spacing.base, paddingTop: 0, gap: spacing.sm },
  pinGroup: { marginBottom: spacing.sm },
  pinLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  pinInput: {
    backgroundColor: colors.background,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    fontSize:        fontSize.lg,
    color:           colors.text,
    letterSpacing:   8,
    minHeight:       44,
  },
  pinBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingVertical: 12,
    alignItems:      'center',
    marginTop:       spacing.xs,
  },
  pinBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },

  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  logoutBtn: {
    backgroundColor: colors.danger + '15',
    borderRadius:    radius.md,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     colors.danger + '40',
    marginTop:       spacing.sm,
  },
  logoutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.danger },
});
