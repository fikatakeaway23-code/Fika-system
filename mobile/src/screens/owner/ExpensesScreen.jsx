import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../../lib/api.js';
import { Badge } from '../../components/Badge.jsx';
import { EXPENSE_CATEGORIES, PAID_BY_OPTIONS } from '../../constants/menu.js';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const CAT_COLORS = {
  supplies:    colors.primary,
  utilities:   '#F59E0B',
  maintenance: '#EF4444',
  transport:   '#8B5CF6',
  food:        '#10B981',
  marketing:   '#3B82F6',
  other:       colors.textMuted,
};

export function ExpensesScreen({ navigation }) {
  const [cursor, setCursor] = useState(new Date());
  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();
  const qc    = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['expenses-monthly', month, year],
    queryFn: () => expenseApi.getMonthly(month, year).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: deleteExp } = useMutation({
    mutationFn: (id) => expenseApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses-monthly', month, year] }),
  });

  function confirmDelete(exp) {
    Alert.alert(
      'Delete Expense',
      `Delete "${exp.name}" for NPR ${Number(exp.amount).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExp(exp.id) },
      ],
    );
  }

  const expenses      = data?.expenses ?? [];
  const categoryTotals = data?.byCategory ?? {};
  const grandTotal    = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Expenses</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Month selector */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setCursor((c) => subMonths(c, 1))}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(cursor, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          style={[styles.navBtn, cursor >= new Date() && styles.navBtnDisabled]}
          onPress={() => cursor < new Date() && setCursor((c) => addMonths(c, 1))}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Total */}
        {grandTotal > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Expenses</Text>
            <Text style={styles.totalValue}>NPR {grandTotal.toLocaleString()}</Text>
          </View>
        )}

        {/* Category chips */}
        {Object.keys(categoryTotals).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {Object.entries(categoryTotals).map(([cat, amt]) => (
              <View key={cat} style={[styles.chip, { borderColor: CAT_COLORS[cat] ?? colors.border }]}>
                <Text style={[styles.chipCat, { color: CAT_COLORS[cat] ?? colors.textMuted }]}>
                  {EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                </Text>
                <Text style={styles.chipAmt}>NPR {Number(amt).toLocaleString()}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* List */}
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses this month.</Text>
        ) : (
          expenses.map((exp) => (
            <TouchableOpacity
              key={exp.id}
              style={styles.expCard}
              onLongPress={() => confirmDelete(exp)}
              activeOpacity={0.8}
            >
              <View style={[styles.catDot, { backgroundColor: CAT_COLORS[exp.category] ?? colors.textMuted }]} />
              <View style={styles.expLeft}>
                <Text style={styles.expName}>{exp.name}</Text>
                <Text style={styles.expMeta}>
                  {format(new Date(exp.date), 'd MMM')}
                  {' · '}
                  {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label ?? exp.category}
                  {' · '}
                  {PAID_BY_OPTIONS.find((p) => p.value === exp.paidBy)?.label ?? exp.paidBy}
                </Text>
              </View>
              <View style={styles.expRight}>
                <Text style={styles.expAmount}>NPR {Number(exp.amount).toLocaleString()}</Text>
                <View style={styles.expBadges}>
                  {exp.receiptAvailable && <Badge variant="active" />}
                  {exp.reimbursed && <Badge variant="pending" />}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.hint}>Long-press an expense to delete it.</Text>
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

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  navBtn:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText:     { fontSize: 24, color: colors.secondary, fontWeight: '300' },
  monthLabel:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  scroll:    { padding: spacing.base, paddingBottom: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  hint:      { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.base },

  totalCard: {
    backgroundColor: colors.secondary, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.base,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  totalValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textInverse },

  chipScroll: { marginBottom: spacing.base },
  chip: {
    borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6,
    marginRight: spacing.xs, backgroundColor: colors.surface, flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  chipCat: { fontSize: fontSize.xs, fontWeight: '700' },
  chipAmt: { fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },

  expCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  catDot:    { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm, flexShrink: 0 },
  expLeft:   { flex: 1, gap: 2 },
  expRight:  { alignItems: 'flex-end', gap: 4 },
  expName:   { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  expMeta:   { fontSize: fontSize.xs, color: colors.textMuted },
  expAmount: { fontSize: fontSize.base, fontWeight: '700', color: colors.secondary },
  expBadges: { flexDirection: 'row', gap: 4 },
});
