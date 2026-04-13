import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useMutation, useQuery } from '@tanstack/react-query';
import { financeApi } from '../../lib/api.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const EMPTY = {
  posTotal: '', posCash: '', posDigital: '',
  baristaCashReported: '', baristaDigitalReported: '',
};

function NumField({ label, value, onChange, required, hint }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}{required && <Text style={{ color: colors.danger }}> *</Text>}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.unit}>NPR</Text>
      </View>
    </View>
  );
}

export function FinanceEntryScreen({ navigation }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); };

  // Pre-fill if record exists for today
  useQuery({
    queryKey: ['finance-today', today],
    queryFn: () => financeApi.getByDate(today).then((r) => r.data),
    onSuccess: (rec) => {
      if (rec) {
        setForm({
          posTotal:              String(rec.posTotal              ?? ''),
          posCash:               String(rec.posCash               ?? ''),
          posDigital:            String(rec.posDigital            ?? ''),
          baristaCashReported:   String(rec.baristaCashReported   ?? ''),
          baristaDigitalReported:String(rec.baristaDigitalReported ?? ''),
        });
      }
    },
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload) => financeApi.create(payload),
    onSuccess: (res) => {
      const rec = res.data;
      if (rec.discrepancyFlag) {
        navigation.navigate('Discrepancy', { record: rec });
      } else {
        navigation.goBack();
      }
    },
    onError: (err) => setError(err?.response?.data?.message ?? 'Failed to save finance record.'),
  });

  function handleSave() {
    const posTotal = parseFloat(form.posTotal);
    const posCash  = parseFloat(form.posCash);
    if (isNaN(posTotal) || isNaN(posCash)) {
      setError('POS Total and POS Cash are required.');
      return;
    }
    save({
      date:                  today,
      posTotal,
      posCash,
      posDigital:            parseFloat(form.posDigital)             || 0,
      baristaCashReported:   parseFloat(form.baristaCashReported)    || 0,
      baristaDigitalReported:parseFloat(form.baristaDigitalReported) || 0,
    });
  }

  // Live discrepancy preview
  const posCash    = parseFloat(form.posCash)             || 0;
  const barCash    = parseFloat(form.baristaCashReported) || 0;
  const diff       = barCash - posCash;
  const showAlert  = Math.abs(diff) > 50 && posCash > 0 && barCash > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Finance Entry</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.dateLabel}>{format(new Date(), 'EEEE, d MMMM yyyy')}</Text>

          {error ? <AlertBanner variant="danger" message={error} /> : null}

          <Text style={styles.sectionTitle}>POS System Figures</Text>
          <NumField label="POS Total"   value={form.posTotal}   onChange={(v) => update({ posTotal: v })}   required hint="Total from POS machine" />
          <NumField label="POS Cash"    value={form.posCash}    onChange={(v) => update({ posCash: v })}    required />
          <NumField label="POS Digital" value={form.posDigital} onChange={(v) => update({ posDigital: v })} />

          <Text style={styles.sectionTitle}>Barista Reported</Text>
          <NumField label="Cash Collected"    value={form.baristaCashReported}    onChange={(v) => update({ baristaCashReported: v })}    hint="What barista counted in drawer" />
          <NumField label="Digital Confirmed" value={form.baristaDigitalReported} onChange={(v) => update({ baristaDigitalReported: v })} />

          {/* Live preview */}
          {(posCash > 0 || barCash > 0) && (
            <View style={styles.summaryBox}>
              <SummaryRow label="POS Cash"          value={`NPR ${posCash.toLocaleString()}`} />
              <SummaryRow label="Barista Reported"  value={`NPR ${barCash.toLocaleString()}`} />
              <SummaryRow
                label="Difference"
                value={`NPR ${diff >= 0 ? '+' : ''}${diff.toLocaleString()}`}
                highlight={Math.abs(diff) > 50}
              />
            </View>
          )}

          {showAlert && (
            <AlertBanner
              variant="warning"
              message={`Discrepancy of NPR ${Math.abs(diff).toLocaleString()} detected. You'll be taken to the discrepancy screen after saving.`}
            />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isPending}
          >
            <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save Finance Record'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && { color: colors.danger, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText:     { fontSize: fontSize.base, fontWeight: '600', color: colors.secondary },
  heading:      { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  scroll:       { padding: spacing.base, paddingBottom: spacing['3xl'] },
  dateLabel:    { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.base },

  group:    { marginBottom: spacing.base },
  label:    { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  hint:     { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.base, color: colors.text, minHeight: 44,
  },
  unit: { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textMuted, width: 36 },

  summaryBox: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.base, borderWidth: 1, borderColor: colors.border,
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  summaryValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  saveBtn: {
    backgroundColor: colors.secondary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm,
  },
  saveBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },
});
