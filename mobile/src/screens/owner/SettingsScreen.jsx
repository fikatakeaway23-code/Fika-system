import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store.js';
import { authApi, notionApi } from '../../lib/api.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

function SectionCard({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
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

export function SettingsScreen({ navigation }) {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [pinRole, setPinRole]       = useState('owner');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError]     = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [syncStatus, setSyncStatus] = useState('');
  const [syncError, setSyncError]   = useState('');

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const apiUrl  = process.env.EXPO_PUBLIC_API_URL ?? 'localhost:4000';

  async function handleChangePin() {
    setPinError('');
    if (currentPin.length !== 4) { setPinError('Current PIN must be 4 digits.'); return; }
    if (newPin.length !== 4)     { setPinError('New PIN must be 4 digits.'); return; }
    if (newPin !== confirmPin)   { setPinError('New PINs do not match.'); return; }

    setPinLoading(true);
    try {
      await authApi.changePin({ role: pinRole, currentPin, newPin });
      setPinSuccess(true);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err) {
      setPinError(err?.response?.data?.message ?? 'Failed to change PIN.');
    } finally {
      setPinLoading(false);
    }
  }

  const { mutate: syncAll, isPending: isSyncing } = useMutation({
    mutationFn: () => notionApi.syncAll(),
    onSuccess: (res) => {
      const { synced, failed } = res.data ?? {};
      setSyncStatus(`Synced ${synced ?? 0} records, ${failed ?? 0} failed.`);
      setSyncError('');
    },
    onError: (err) => {
      setSyncError(err?.response?.data?.message ?? 'Notion sync failed.');
      setSyncStatus('');
    },
  });

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  const PIN_ROLES = [
    { value: 'owner',      label: 'Owner' },
    { value: 'barista_am', label: 'Barista 1' },
    { value: 'barista_pm', label: 'Barista 2' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <SectionCard title="Owner Profile">
          <InfoRow label="Name"  value={user?.name} />
          <InfoRow label="Role"  value={user?.role} />
        </SectionCard>

        {/* Change PIN */}
        <SectionCard title="Change PIN">
          <Text style={styles.sectionSub}>You can change PINs for any staff member.</Text>

          {pinSuccess && <AlertBanner variant="success" message="PIN updated successfully!" />}
          {pinError   && <AlertBanner variant="danger"  message={pinError} />}

          <Text style={styles.pinLabel}>Change PIN for</Text>
          <View style={styles.optRow}>
            {PIN_ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.optBtn, pinRole === r.value && styles.optBtnActive]}
                onPress={() => setPinRole(r.value)}
              >
                <Text style={[styles.optBtnText, pinRole === r.value && styles.optBtnTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <PinField label="Current PIN (owner's PIN to authorise)" value={currentPin} onChange={setCurrentPin} />
          <PinField label="New PIN"     value={newPin}     onChange={setNewPin} />
          <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />

          <TouchableOpacity
            style={[styles.actionBtn, pinLoading && { opacity: 0.6 }]}
            onPress={handleChangePin}
            disabled={pinLoading}
          >
            <Text style={styles.actionBtnText}>{pinLoading ? 'Saving…' : 'Save New PIN'}</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Notion Sync */}
        <SectionCard title="Notion Sync">
          <Text style={styles.sectionSub}>Push all records to Notion databases.</Text>

          {syncStatus ? <AlertBanner variant="success" message={syncStatus} /> : null}
          {syncError  ? <AlertBanner variant="danger"  message={syncError}  /> : null}

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnNotion, isSyncing && { opacity: 0.6 }]}
            onPress={() => syncAll()}
            disabled={isSyncing}
          >
            <Text style={styles.actionBtnText}>{isSyncing ? 'Syncing…' : '↑ Sync All to Notion'}</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* App Info */}
        <SectionCard title="App Info">
          <InfoRow label="Version"     value={`v${version}`} />
          <InfoRow label="API URL"     value={apiUrl} />
          <InfoRow label="Environment" value={process.env.NODE_ENV ?? 'production'} />
        </SectionCard>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: fontSize.base, fontWeight: '600', color: colors.secondary },
  heading:  { fontSize: fontSize.base, fontWeight: '700', color: colors.text },

  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  section: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.base,
    overflow: 'hidden', ...shadow.sm,
  },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionSub:   { fontSize: fontSize.sm, color: colors.textMuted, paddingHorizontal: spacing.base, paddingTop: spacing.sm },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, maxWidth: '55%', textAlign: 'right' },

  pinGroup: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  pinLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  pinInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.lg, color: colors.text, letterSpacing: 8, minHeight: 44,
  },

  optRow:          { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  optBtn:          { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optBtnActive:    { backgroundColor: colors.secondary, borderColor: colors.secondary },
  optBtnText:      { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  optBtnTextActive:{ color: colors.textInverse },

  actionBtn: {
    marginHorizontal: spacing.base, marginVertical: spacing.base,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center',
  },
  actionBtnNotion: { backgroundColor: '#1A1523' },
  actionBtnText:   { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },

  logoutBtn: {
    backgroundColor: colors.danger + '15', borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.danger + '40',
  },
  logoutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.danger },
});
