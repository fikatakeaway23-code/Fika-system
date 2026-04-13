import React from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { reportApi, financeApi, shiftApi, membershipApi } from '../../lib/api.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { MetricCard } from '../../components/MetricCard.jsx';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { Badge } from '../../components/Badge.jsx';
import { NetworkIndicator } from '../../components/NetworkIndicator.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OwnerDashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: weekly, isLoading: weeklyLoading, refetch: refetchWeekly, isRefetching } =
    useQuery({ queryKey: ['weekly-report'], queryFn: () => reportApi.weekly().then((r) => r.data), staleTime: 120_000 });

  const { data: discrepancies } =
    useQuery({ queryKey: ['discrepancies'], queryFn: () => financeApi.getDiscrepancies().then((r) => r.data), staleTime: 120_000 });

  const { data: recentShifts, refetch: refetchShifts } =
    useQuery({ queryKey: ['recent-shifts'], queryFn: () => shiftApi.getAll({ limit: 3 }).then((r) => r.data), staleTime: 60_000 });

  const { data: memberships } =
    useQuery({ queryKey: ['memberships-count'], queryFn: () => membershipApi.getAll({ status: 'active' }).then((r) => r.data), staleTime: 300_000 });

  function refetch() { refetchWeekly(); refetchShifts(); }

  const today = weekly?.days?.find((d) => d.date === format(new Date(), 'yyyy-MM-dd'));
  const todaySales  = today?.revenue ?? 0;
  const todayDrinks = today?.drinksCount ?? 0;
  const activeMembers = memberships?.length ?? 0;
  const pendingDisc   = discrepancies?.length ?? 0;

  const weekTotal = weekly?.summary?.totalRevenue ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>Owner Dashboard</Text>
            <Text style={styles.date}>{format(new Date(), 'EEEE, d MMMM yyyy')}</Text>
          </View>
          <NetworkIndicator />
        </View>

        {/* Discrepancy alert */}
        {pendingDisc > 0 && (
          <AlertBanner
            variant="danger"
            message={`${pendingDisc} cash discrepanc${pendingDisc === 1 ? 'y' : 'ies'} require your attention.`}
          />
        )}

        {/* Metric grid */}
        <View style={styles.grid}>
          <MetricCard label="Today's Sales" value={`NPR ${todaySales.toLocaleString()}`} sub="POS total" />
          <MetricCard label="Drinks Today"  value={String(todayDrinks)} sub="served" />
          <MetricCard label="Active Members" value={String(activeMembers)} sub="corporates" accent />
          <MetricCard label="Discrepancies" value={String(pendingDisc)} sub="unresolved" />
        </View>

        {/* Weekly revenue bar */}
        {weekly?.days && (
          <>
            <Text style={styles.sectionTitle}>This Week — NPR {weekTotal.toLocaleString()}</Text>
            <View style={styles.barChart}>
              {weekly.days.map((day) => {
                const max = Math.max(...weekly.days.map((d) => d.revenue ?? 0), 1);
                const pct = ((day.revenue ?? 0) / max) * 100;
                const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                return (
                  <View key={day.date} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${pct}%` }, isToday && styles.barFillToday]} />
                    </View>
                    <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                      {format(new Date(day.date), 'EEE')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Recent shifts */}
        <Text style={styles.sectionTitle}>Recent Shifts</Text>
        {!recentShifts || recentShifts.length === 0 ? (
          <Text style={styles.emptyText}>No shifts yet.</Text>
        ) : (
          recentShifts.map((shift) => (
            <View key={shift.id} style={styles.shiftRow}>
              <View>
                <Text style={styles.shiftDate}>{format(new Date(shift.date), 'EEE d MMM')}</Text>
                <Text style={styles.shiftBarista}>{shift.user?.name ?? shift.shiftType === 'am' ? 'Barista 1' : 'Barista 2'}</Text>
              </View>
              <View style={styles.shiftRight}>
                {shift.drinksCount != null && (
                  <Text style={styles.shiftDrinks}>{shift.drinksCount} drinks</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Badge variant={shift.shiftType} />
                  <Badge variant={shift.status} />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   spacing.xl,
    paddingTop:     spacing.md,
  },
  greeting: { fontSize: fontSize.sm, color: colors.textMuted },
  name:     { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  date:     { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },

  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  emptyText:    { fontSize: fontSize.sm, color: colors.textMuted, paddingVertical: spacing.sm },

  barChart: {
    flexDirection:  'row',
    height:         120,
    gap:            spacing.xs,
    marginBottom:   spacing.md,
    backgroundColor: colors.surface,
    borderRadius:   radius.lg,
    padding:        spacing.md,
    borderWidth:    1,
    borderColor:    colors.border,
  },
  barCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack:    { flex: 1, width: '80%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: colors.border },
  barFill:     { width: '100%', backgroundColor: colors.primary + '80', borderRadius: 4 },
  barFillToday:{ backgroundColor: colors.primary },
  barLabel:    { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  barLabelToday: { color: colors.primary, fontWeight: '700' },

  shiftRow: {
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
  shiftDate:    { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  shiftBarista: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  shiftRight:   { alignItems: 'flex-end', gap: 4 },
  shiftDrinks:  { fontSize: fontSize.sm, color: colors.textMuted },
});
