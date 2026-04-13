import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../../lib/api.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { Badge } from '../../components/Badge.jsx';
import { EXPENSE_CATEGORIES, PAID_BY_OPTIONS } from '../../constants/menu.js';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const EMPTY_FORM = {
  name:              '',
  date:              format(new Date(), 'yyyy-MM-dd'),
  category:          'supplies',
  amount:            '',
  paidBy:            'shop_cash',
  reimbursed:        false,
  receiptAvailable:  false,
};

function SegmentControl({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.base }}>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export function ExpenseScreen() {
  const user        = useAuthStore((s) => s.user);
  const qc          = useQueryClient();
  const [form, setForm]     = useState({ ...EMPTY_FORM, paidBy: user?.role === 'barista_am' ? 'barista1' : 'barista2' });
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const month = parseInt(today.slice(5, 7));
  const year  = parseInt(today.slice(0, 4));

  const { data: todayExpenses } = useQuery({
    queryKey: ['expenses', today],
    queryFn: () => expenseApi.list({ date: today }).then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate: addExpense, isPending } = useMutation({
    mutationFn: (payload) => expenseApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setSuccess(true);
      setForm({ ...EMPTY_FORM, paidBy: form.paidBy });
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err) => {
      setError(err?.response?.data?.message ?? 'Failed to log expense.');
    },
  });

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
    setError('');
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Please enter an expense name.'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Please enter a valid amount.'); return; }

    addExpense({
      name:             form.name.trim(),
      date:             form.date,
      category:         form.category,
      amount:           parseFloat(form.amount),
      paidBy:           form.paidBy,
      reimbursed:       form.reimbursed,
      receiptAvailable: form.receiptAvailable,
      loggedBy:         user?.role ?? 'barista_am',
      month,
      year,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Log Expense</Text>
          <Text style={styles.sub}>Record shop expenses quickly.</Text>

          {success && <AlertBanner variant="success" message="Expense logged successfully!" />}
          {error    && <AlertBanner variant="danger"  message={error} />}

          {/* Name */}
          <View style={styles.group}>
            <Text style={styles.label}>Expense Name <Text style={{ color: colors.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => update({ name: v })}
              placeholder="e.g. Milk delivery, Printer paper…"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Amount */}
          <View style={styles.group}>
            <Text style={styles.label}>Amount (NPR) <Text style={{ color: colors.danger }}>*</Text></Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.amount}
                onChangeText={(v) => update({ amount: v })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.unit}>NPR</Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.group}>
            <Text style={styles.label}>Category</Text>
            <SegmentControl options={EXPENSE_CATEGORIES} value={form.category} onChange={(v) => update({ category: v })} />
          </View>

          {/* Paid by */}
          <View style={styles.group}>
            <Text style={styles.label}>Paid by</Text>
            <SegmentControl options={PAID_BY_OPTIONS} value={form.paidBy} onChange={(v) => update({ paidBy: v })} />
          </View>

          {/* Toggles */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Receipt available</Text>
            <Switch
              value={form.receiptAvailable}
              onValueChange={(v) => update({ receiptAvailable: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Reimbursement needed</Text>
            <Switch
              value={form.reimbursed}
              onValueChange={(v) => update({ reimbursed: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            <Text style={styles.submitBtnText}>{isPending ? 'Saving…' : 'Log Expense'}</Text>
          </TouchableOpacity>

          {/* Today's expenses */}
          {todayExpenses?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Today's Expenses</Text>
              {todayExpenses.map((exp) => (
                <View key={exp.id} style={styles.expCard}>
                  <View style={styles.expLeft}>
                    <Text style={styles.expName}>{exp.name}</Text>
                    <Text style={styles.expMeta}>
                      {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}
                      {' · '}
                      {PAID_BY_OPTIONS.find((p) => p.value === exp.paidBy)?.label ?? exp.paidBy}
                    </Text>
                  </View>
                  <View style={styles.expRight}>
                    <Text style={styles.expAmount}>NPR {Number(exp.amount).toLocaleString()}</Text>
                    {exp.receiptAvailable && <Badge variant="active" />}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  scroll:  { padding: spacing.base, paddingBottom: spacing['3xl'] },

  heading: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: 4, paddingTop: spacing.md },
  sub:     { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing.xl },

  group:  { marginBottom: spacing.base },
  label:  { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    fontSize:        fontSize.base,
    color:           colors.text,
    minHeight:       44,
  },
  inputRow:  { flexDirection: 'row', alignItems: 'center' },
  unit:      { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textMuted },

  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical:   8,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  segmentActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText:       { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.textInverse },

  toggleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  toggleLabel: { fontSize: fontSize.base, color: colors.text },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  submitBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },

  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  expCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    ...shadow.sm,
  },
  expLeft:   { flex: 1, gap: 2 },
  expRight:  { alignItems: 'flex-end', gap: 4 },
  expName:   { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  expMeta:   { fontSize: fontSize.sm, color: colors.textMuted },
  expAmount: { fontSize: fontSize.base, fontWeight: '700', color: colors.secondary },
});
