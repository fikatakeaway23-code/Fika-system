import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity,
  Modal, RefreshControl,
} from 'react-native';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { shiftApi } from '../../lib/api.js';
import { Badge } from '../../components/Badge.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const FILTERS = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
];

function getDateRange(filter) {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  if (filter === 'today') return { from: today, to: today };
  if (filter === 'week')  return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: today };
  return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today };
}

function DetailModal({ shift, onClose }) {
  if (!shift) return null;

  const rows = [
    { label: 'Date',          value: format(new Date(shift.date), 'EEEE, d MMMM yyyy') },
    { label: 'Shift',         value: shift.shiftType === 'am' ? 'Morning (AM)' : 'Afternoon (PM)' },
    { label: 'Status',        value: shift.status },
    { label: 'Opening Float', value: shift.openingFloat != null ? `NPR ${Number(shift.openingFloat).toLocaleString()}` : '—' },
    { label: 'Cash Sales',    value: shift.cashSales    != null ? `NPR ${Number(shift.cashSales).toLocaleString()}`    : '—' },
    { label: 'Digital Sales', value: shift.digitalSales != null ? `NPR ${Number(shift.digitalSales).toLocaleString()}` : '—' },
    { label: 'Closing Cash',  value: shift.closingCash  != null ? `NPR ${Number(shift.closingCash).toLocaleString()}`  : '—' },
    { label: 'Drinks Served', value: shift.drinksCount  != null ? String(shift.drinksCount)  : '—' },
    { label: 'Popular Drink', value: shift.popularDrink ?? '—' },
    { label: 'Pastries Sold', value: shift.pastriesSold != null ? String(shift.pastriesSold) : '—' },
  ];

  if (shift.equipmentIssue) rows.push({ label: 'Equipment Issue', value: shift.equipmentNotes ?? 'Flagged' });
  if (shift.complaintFlag)  rows.push({ label: 'Complaint',       value: shift.complaintNotes ?? 'Flagged' });
  if (shift.shiftNotes)     rows.push({ label: 'Notes',           value: shift.shiftNotes });

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.safe}>
        <View style={modal.header}>
          <Text style={modal.title}>Shift Detail</Text>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Text style={modal.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={modal.scroll}>
          <View style={modal.badgeRow}>
            <Badge variant={shift.shiftType} />
            <Badge variant={shift.status} />
            {shift.equipmentIssue && <Badge variant="alert" />}
          </View>
          {rows.map(({ label, value }) => (
            <View key={label} style={modal.row}>
              <Text style={modal.rowLabel}>{label}</Text>
              <Text style={modal.rowValue}>{value}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function ShiftsScreen() {
  const [filter, setFilter] = useState('week');
  const [selected, setSelected] = useState(null);

  const range = getDateRange(filter);

  const { data: shifts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shifts', filter],
    queryFn: () => shiftApi.getAll({ from: range.from, to: range.to }).then((r) => r.data),
    staleTime: 60_000,
  });

  const amShifts = shifts?.filter((s) => s.shiftType === 'am') ?? [];
  const pmShifts = shifts?.filter((s) => s.shiftType === 'pm') ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <DetailModal shift={selected} onClose={() => setSelected(null)} />

      <View style={styles.topBar}>
        <Text style={styles.heading}>Shifts</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : !shifts?.length ? (
          <Text style={styles.emptyText}>No shifts in this period.</Text>
        ) : (
          <>
            {[{ label: 'Morning (AM)', list: amShifts }, { label: 'Afternoon (PM)', list: pmShifts }].map(({ label, list }) =>
              list.length > 0 ? (
                <View key={label}>
                  <Text style={styles.groupLabel}>{label}</Text>
                  {list.map((shift) => (
                    <TouchableOpacity key={shift.id} style={styles.row} onPress={() => setSelected(shift)} activeOpacity={0.8}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowDate}>{format(new Date(shift.date), 'EEE d MMM')}</Text>
                        <Text style={styles.rowBarista}>
                          {shift.user?.name ?? (shift.shiftType === 'am' ? 'Barista 1' : 'Barista 2')}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        {shift.drinksCount != null && (
                          <Text style={styles.rowDrinks}>{shift.drinksCount} drinks</Text>
                        )}
                        <Badge variant={shift.status} />
                      </View>
                      <Text style={styles.rowChevron}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  topBar:  { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  heading: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: colors.textInverse },

  scroll:     { padding: spacing.base, paddingBottom: spacing['3xl'] },
  emptyText:  { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  groupLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
    ...shadow.sm,
  },
  rowLeft:    { flex: 1, gap: 2 },
  rowRight:   { alignItems: 'flex-end', gap: 4, marginRight: spacing.sm },
  rowDate:    { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  rowBarista: { fontSize: fontSize.sm, color: colors.textMuted },
  rowDrinks:  { fontSize: fontSize.sm, color: colors.textMuted },
  rowChevron: { fontSize: 20, color: colors.textMuted },
});

const modal = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.background },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:    { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  closeBtn: { paddingHorizontal: spacing.sm },
  closeText:{ fontSize: fontSize.base, fontWeight: '600', color: colors.primary },
  scroll:   { padding: spacing.base },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.base },
  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  rowValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },
});
