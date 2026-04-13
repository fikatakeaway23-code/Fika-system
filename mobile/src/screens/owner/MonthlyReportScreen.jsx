import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../lib/api.js';
import { MetricCard } from '../../components/MetricCard.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function StatRow({ label, value, highlight }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

function SimpleBar({ label, value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

export function MonthlyReportScreen({ navigation }) {
  const [cursor, setCursor] = useState(new Date());
  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['monthly-report', month, year],
    queryFn: () => reportApi.monthly(month, year).then((r) => r.data),
    staleTime: 300_000,
  });

  const revenue   = data?.revenue   ?? {};
  const expenses  = data?.expenses  ?? {};
  const operations = data?.operations ?? {};
  const waste     = data?.waste     ?? {};
  const drinks    = data?.drinks    ?? [];

  const netProfit = (revenue.total ?? 0) - (expenses.total ?? 0);
  const maxDrinks = Math.max(...drinks.map((d) => d.count ?? 0), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Monthly Report</Text>
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
        {isLoading ? (
          <Text style={styles.emptyText}>Loading report…</Text>
        ) : !data ? (
          <Text style={styles.emptyText}>No data for this month.</Text>
        ) : (
          <>
            {/* Summary metrics */}
            <View style={styles.grid}>
              <MetricCard label="Total Revenue" value={`NPR ${(revenue.total ?? 0).toLocaleString()}`}  sub="gross sales" accent />
              <MetricCard label="Net Profit"    value={`NPR ${netProfit.toLocaleString()}`}              sub="after expenses" />
              <MetricCard label="Total Expenses" value={`NPR ${(expenses.total ?? 0).toLocaleString()}`} sub="all categories" />
              <MetricCard label="Shifts Done"   value={String(operations.shiftsCompleted ?? 0)}          sub="completed" />
            </View>

            {/* Revenue breakdown */}
            <SectionTitle>Revenue Breakdown</SectionTitle>
            <View style={styles.card}>
              <StatRow label="POS Total"      value={`NPR ${(revenue.total ?? 0).toLocaleString()}`} />
              <StatRow label="Cash Sales"     value={`NPR ${(revenue.cash ?? 0).toLocaleString()}`} />
              <StatRow label="Digital Sales"  value={`NPR ${(revenue.digital ?? 0).toLocaleString()}`} />
              <StatRow label="Net Profit"     value={`NPR ${netProfit.toLocaleString()}`} highlight={netProfit > 0} />
            </View>

            {/* Expenses */}
            <SectionTitle>Expense Breakdown</SectionTitle>
            <View style={styles.card}>
              {Object.entries(expenses.byCategory ?? {}).map(([cat, amt]) => (
                <StatRow key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)} value={`NPR ${Number(amt).toLocaleString()}`} />
              ))}
              {!Object.keys(expenses.byCategory ?? {}).length && (
                <Text style={styles.emptyText}>No expenses recorded.</Text>
              )}
            </View>

            {/* Operations */}
            <SectionTitle>Operations</SectionTitle>
            <View style={styles.card}>
              <StatRow label="Shifts Completed"   value={String(operations.shiftsCompleted ?? 0)} />
              <StatRow label="Avg Drinks / Shift" value={operations.avgDrinksPerShift != null ? operations.avgDrinksPerShift.toFixed(1) : '—'} />
              <StatRow label="Total Drinks Served" value={String(operations.totalDrinks ?? 0)} />
              <StatRow label="Total Pastries Sold" value={String(operations.totalPastries ?? 0)} />
            </View>

            {/* Waste */}
            <SectionTitle>Waste Summary</SectionTitle>
            <View style={styles.card}>
              <StatRow label="Calibration Shots" value={String(waste.calibrationShots ?? 0)} />
              <StatRow label="Milk Wasted (ml)"  value={String(waste.milkWasted ?? 0)} />
              <StatRow label="Drinks Remade"     value={String(waste.remadeDrinks ?? 0)} />
              <StatRow label="Unsold Pastries"   value={String(waste.unsoldPastries ?? 0)} />
            </View>

            {/* Top drinks */}
            {drinks.length > 0 && (
              <>
                <SectionTitle>Top Drinks</SectionTitle>
                <View style={styles.card}>
                  {drinks.slice(0, 8).map((d) => (
                    <SimpleBar key={d.name} label={d.name} value={d.count} max={maxDrinks} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  topBar:  {
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

  scroll:       { padding: spacing.base, paddingBottom: spacing['3xl'] },
  emptyText:    { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.base },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.base },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  statRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel:         { fontSize: fontSize.sm, color: colors.textMuted },
  statValue:         { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  statValueHighlight:{ color: colors.secondary, fontWeight: '700' },

  barRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel:  { fontSize: fontSize.xs, color: colors.text, width: 100 },
  barTrack:  { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: spacing.sm },
  barFill:   { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  barValue:  { fontSize: fontSize.xs, color: colors.textMuted, width: 30, textAlign: 'right' },
});
