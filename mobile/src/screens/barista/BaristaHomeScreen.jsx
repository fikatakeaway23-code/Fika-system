import React, { useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store.js';
import { useShiftStore } from '../../stores/shift.store.js';
import { shiftApi } from '../../lib/api.js';
import { NetworkIndicator } from '../../components/NetworkIndicator.jsx';
import { Badge } from '../../components/Badge.jsx';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

function getTodayShiftType(role) {
  return role === 'barista_am' ? 'am' : 'pm';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function BaristaHomeScreen({ navigation }) {
  const user      = useAuthStore((s) => s.user);
  const initDraft = useShiftStore((s) => s.initDraft);
  const draft     = useShiftStore((s) => s.draft);
  const [starting, setStarting] = useState(false);

  const today     = format(new Date(), 'yyyy-MM-dd');
  const shiftType = getTodayShiftType(user?.role);
  const shiftLabel = shiftType === 'am' ? 'Morning Shift' : 'Afternoon Shift';
  const shiftHours = shiftType === 'am' ? '6:00 AM – 2:00 PM' : '12:00 PM – 8:00 PM';

  const { data: recentShifts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-shifts', user?.role],
    queryFn: () => shiftApi.list({ role: user?.role, limit: 3 }).then((r) => r.data),
    staleTime: 60_000,
  });

  const latestShift = recentShifts?.[0];
  const hasTodayShift = latestShift?.date?.startsWith(today) && latestShift?.shiftType === shiftType;
  const todaySubmitted = hasTodayShift && latestShift?.status === 'submitted';
  const todayInProgress = hasTodayShift && latestShift?.status === 'in_progress';
  const hasDraft = draft.date === today && draft.shiftType === shiftType;

  async function handleStartShift() {
    setStarting(true);
    try {
      await initDraft(today, shiftType);
      navigation.navigate('ShiftForm');
    } finally {
      setStarting(false);
    }
  }

  function handleContinueShift() {
    navigation.navigate('ShiftForm');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{user?.name ?? 'Barista'} ☕</Text>
          </View>
          <NetworkIndicator />
        </View>

        {/* Today's shift card */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftCardTop}>
            <View>
              <Text style={styles.shiftCardLabel}>Today's Shift</Text>
              <Text style={styles.shiftCardTitle}>{shiftLabel}</Text>
              <Text style={styles.shiftCardHours}>{shiftHours}</Text>
            </View>
            <Badge variant={shiftType} />
          </View>

          <Text style={styles.dateText}>{format(new Date(), 'EEEE, d MMMM yyyy')}</Text>

          {todaySubmitted ? (
            <View style={styles.submittedRow}>
              <Text style={styles.submittedIcon}>✓</Text>
              <Text style={styles.submittedText}>Shift report submitted</Text>
            </View>
          ) : todayInProgress || hasDraft ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnContinue]} onPress={handleContinueShift}>
              <Text style={styles.actionBtnText}>Continue Report →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, starting && styles.actionBtnDisabled]}
              onPress={handleStartShift}
              disabled={starting}
            >
              <Text style={styles.actionBtnText}>{starting ? 'Starting…' : 'Start Shift Report'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Draft recovery notice */}
        {hasDraft && !todayInProgress && (
          <AlertBanner
            variant="warning"
            message="You have an unsaved draft from earlier. Tap 'Continue Report' to pick up where you left off."
          />
        )}

        {/* Quick stats */}
        <Text style={styles.sectionTitle}>Recent Shifts</Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : recentShifts?.length === 0 ? (
          <Text style={styles.emptyText}>No shifts logged yet.</Text>
        ) : (
          recentShifts?.map((shift) => (
            <View key={shift.id} style={styles.recentCard}>
              <View style={styles.recentLeft}>
                <Text style={styles.recentDate}>{format(new Date(shift.date), 'EEE d MMM')}</Text>
                <Text style={styles.recentType}>{shift.shiftType === 'am' ? 'Morning' : 'Afternoon'}</Text>
              </View>
              <View style={styles.recentRight}>
                {shift.drinksCount != null && (
                  <Text style={styles.recentStat}>{shift.drinksCount} drinks</Text>
                )}
                <Badge variant={shift.status} />
              </View>
            </View>
          ))
        )}

        {/* Tips */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Daily Reminder</Text>
          <Text style={styles.tipText}>
            Always dial in espresso at the start of shift. Target extraction: 25–30 seconds.
          </Text>
        </View>
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
  greeting: { fontSize: fontSize.sm,   color: colors.textMuted },
  name:     { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },

  shiftCard: {
    backgroundColor: colors.primary,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    marginBottom:    spacing.base,
    ...shadow.md,
  },
  shiftCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  shiftCardLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  shiftCardTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textInverse, marginTop: 2 },
  shiftCardHours: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  dateText:       { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.base },

  actionBtn: {
    backgroundColor: colors.textInverse,
    borderRadius:    radius.md,
    paddingVertical: 12,
    alignItems:      'center',
  },
  actionBtnContinue: { backgroundColor: colors.secondary },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText:     { fontSize: fontSize.base, fontWeight: '700', color: colors.primary },

  submittedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submittedIcon: { fontSize: 18, color: colors.textInverse },
  submittedText: { fontSize: fontSize.base, color: colors.textInverse, fontWeight: '600' },

  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  loadingText:  { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.base },
  emptyText:    { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.base },

  recentCard: {
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
  recentLeft:  { gap: 2 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentDate:  { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  recentType:  { fontSize: fontSize.sm, color: colors.textMuted },
  recentStat:  { fontSize: fontSize.sm, color: colors.textMuted },

  tipCard: {
    backgroundColor: colors.primaryLight,
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginTop:       spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary, marginBottom: 4 },
  tipText:  { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
});
