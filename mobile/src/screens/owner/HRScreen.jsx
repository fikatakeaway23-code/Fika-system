import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../lib/api.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const TAB_TYPES = [
  { label: 'Attendance', value: 'attendance' },
  { label: 'Leave',      value: 'leave' },
  { label: 'Incidents',  value: 'incident' },
  { label: 'Salary',     value: 'salary' },
];

const STAFF_OPTIONS = [
  { value: 'barista_am', label: 'Barista 1' },
  { value: 'barista_pm', label: 'Barista 2' },
];

const LEAVE_TYPES     = ['sick', 'personal', 'annual', 'unpaid', 'other'];
const INCIDENT_TYPES  = ['late', 'no_show', 'misconduct', 'complaint', 'praise', 'other'];

// ── Empty forms per type ──────────────────────────────────────────────────────
const EMPTY = {
  attendance: { staffMemberId: 'barista_am', date: format(new Date(), 'yyyy-MM-dd'), arrivalTime: '', lateMinutes: '', overtimeMinutes: '', absent: false, notes: '' },
  leave:      { staffMemberId: 'barista_am', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', leaveType: 'sick', approvedByOwner: true, notes: '' },
  incident:   { staffMemberId: 'barista_am', date: format(new Date(), 'yyyy-MM-dd'), incidentType: 'late', description: '', actionTaken: '' },
  salary:     { staffMemberId: 'barista_am', month: new Date().getMonth() + 1, year: new Date().getFullYear(), baseSalary: '', bonusAmount: '', deductions: '', paymentDate: '' },
};

// ── Record card ───────────────────────────────────────────────────────────────
function RecordCard({ rec, type }) {
  const staffLabel = STAFF_OPTIONS.find((s) => s.value === rec.staffMemberId)?.label ?? rec.staffMemberId;

  let primary = staffLabel;
  let secondary = '';

  if (type === 'attendance') {
    secondary = `${rec.date ?? ''}${rec.absent ? ' · Absent' : rec.arrivalTime ? ` · Arrived ${rec.arrivalTime}` : ''}${rec.lateMinutes ? ` · ${rec.lateMinutes}m late` : ''}`;
  } else if (type === 'leave') {
    secondary = `${rec.leaveType ?? ''} · ${rec.startDate ?? ''}${rec.endDate ? ` – ${rec.endDate}` : ''}`;
  } else if (type === 'incident') {
    secondary = `${rec.incidentType ?? ''} · ${rec.date ?? ''}`;
    if (rec.description) secondary += ` · ${rec.description.slice(0, 40)}`;
  } else if (type === 'salary') {
    const net = (Number(rec.baseSalary ?? 0) + Number(rec.bonusAmount ?? 0) - Number(rec.deductions ?? 0));
    secondary = `Month ${rec.month}/${rec.year} · Net NPR ${net.toLocaleString()}`;
  }

  return (
    <View style={styles.recCard}>
      <Text style={styles.recPrimary}>{primary}</Text>
      <Text style={styles.recSecondary}>{secondary}</Text>
      {rec.notes && <Text style={styles.recNotes}>{rec.notes}</Text>}
    </View>
  );
}

// ── Log modal ─────────────────────────────────────────────────────────────────
function LogModal({ visible, type, onClose, onSave, isPending, error }) {
  const [form, setForm] = useState({ ...EMPTY[type] });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Reset form when type changes
  React.useEffect(() => { setForm({ ...EMPTY[type] }); }, [type]);

  function handleSave() {
    const payload = { ...form, type };
    if (type === 'attendance') {
      if (form.lateMinutes)    payload.lateMinutes    = parseInt(form.lateMinutes);
      if (form.overtimeMinutes) payload.overtimeMinutes = parseInt(form.overtimeMinutes);
    }
    if (type === 'salary') {
      payload.baseSalary   = parseFloat(form.baseSalary)   || 0;
      payload.bonusAmount  = parseFloat(form.bonusAmount)  || 0;
      payload.deductions   = parseFloat(form.deductions)   || 0;
    }
    onSave(payload);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={modal.header}>
            <TouchableOpacity onPress={onClose}><Text style={modal.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={modal.title}>Log {TAB_TYPES.find((t) => t.value === type)?.label}</Text>
            <TouchableOpacity onPress={handleSave} disabled={isPending}>
              <Text style={[modal.save, isPending && { opacity: 0.5 }]}>{isPending ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modal.scroll} keyboardShouldPersistTaps="handled">
            {error ? <AlertBanner variant="danger" message={error} /> : null}

            {/* Staff selector */}
            <Text style={modal.label}>Staff Member</Text>
            <View style={modal.optRow}>
              {STAFF_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[modal.optBtn, form.staffMemberId === s.value && modal.optBtnActive]}
                  onPress={() => set({ staffMemberId: s.value })}
                >
                  <Text style={[modal.optText, form.staffMemberId === s.value && modal.optTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Attendance fields */}
            {type === 'attendance' && (
              <>
                <MField label="Date (YYYY-MM-DD)" value={form.date}            onChange={(v) => set({ date: v })} />
                <MField label="Arrival Time"      value={form.arrivalTime}     onChange={(v) => set({ arrivalTime: v })}     placeholder="e.g. 06:05" />
                <MField label="Late (minutes)"    value={form.lateMinutes}     onChange={(v) => set({ lateMinutes: v })}     keyboardType="number-pad" />
                <MField label="Overtime (minutes)" value={form.overtimeMinutes} onChange={(v) => set({ overtimeMinutes: v })} keyboardType="number-pad" />
                <ToggleRow label="Absent" value={form.absent} onChange={(v) => set({ absent: v })} />
                <MField label="Notes" value={form.notes} onChange={(v) => set({ notes: v })} multiline />
              </>
            )}

            {/* Leave fields */}
            {type === 'leave' && (
              <>
                <MField label="Start Date (YYYY-MM-DD)" value={form.startDate} onChange={(v) => set({ startDate: v })} />
                <MField label="End Date (YYYY-MM-DD)"   value={form.endDate}   onChange={(v) => set({ endDate: v })} />
                <Text style={modal.label}>Leave Type</Text>
                <View style={modal.optRow}>
                  {LEAVE_TYPES.map((lt) => (
                    <TouchableOpacity
                      key={lt}
                      style={[modal.optBtn, form.leaveType === lt && modal.optBtnActive]}
                      onPress={() => set({ leaveType: lt })}
                    >
                      <Text style={[modal.optText, form.leaveType === lt && modal.optTextActive]}>{lt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ToggleRow label="Approved" value={form.approvedByOwner} onChange={(v) => set({ approvedByOwner: v })} />
                <MField label="Notes" value={form.notes} onChange={(v) => set({ notes: v })} multiline />
              </>
            )}

            {/* Incident fields */}
            {type === 'incident' && (
              <>
                <MField label="Date (YYYY-MM-DD)" value={form.date} onChange={(v) => set({ date: v })} />
                <Text style={modal.label}>Incident Type</Text>
                <View style={modal.optRow}>
                  {INCIDENT_TYPES.map((it) => (
                    <TouchableOpacity
                      key={it}
                      style={[modal.optBtn, form.incidentType === it && modal.optBtnActive]}
                      onPress={() => set({ incidentType: it })}
                    >
                      <Text style={[modal.optText, form.incidentType === it && modal.optTextActive]}>{it}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <MField label="Description" value={form.description} onChange={(v) => set({ description: v })} multiline />
                <MField label="Action Taken" value={form.actionTaken} onChange={(v) => set({ actionTaken: v })} multiline />
              </>
            )}

            {/* Salary fields */}
            {type === 'salary' && (
              <>
                <MField label="Month (1–12)"    value={String(form.month)} onChange={(v) => set({ month: parseInt(v) || 1 })} keyboardType="number-pad" />
                <MField label="Year"            value={String(form.year)}  onChange={(v) => set({ year: parseInt(v) || new Date().getFullYear() })} keyboardType="number-pad" />
                <MField label="Base Salary (NPR)" value={form.baseSalary}  onChange={(v) => set({ baseSalary: v })}  keyboardType="decimal-pad" />
                <MField label="Bonus (NPR)"     value={form.bonusAmount}   onChange={(v) => set({ bonusAmount: v })} keyboardType="decimal-pad" />
                <MField label="Deductions (NPR)" value={form.deductions}   onChange={(v) => set({ deductions: v })}  keyboardType="decimal-pad" />
                <MField label="Payment Date (YYYY-MM-DD)" value={form.paymentDate} onChange={(v) => set({ paymentDate: v })} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function MField({ label, value, onChange, placeholder, keyboardType, multiline }) {
  return (
    <View style={modal.group}>
      <Text style={modal.label}>{label}</Text>
      <TextInput
        style={[modal.input, multiline && modal.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={modal.toggleRow}>
      <Text style={modal.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.textInverse} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function HRScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('attendance');
  const [showLog, setShowLog]     = useState(false);
  const [logError, setLogError]   = useState('');
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hr', activeTab],
    queryFn: () => hrApi.getAll({ type: activeTab }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: createRecord, isPending } = useMutation({
    mutationFn: (payload) => hrApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', activeTab] });
      setShowLog(false);
      setLogError('');
    },
    onError: (err) => setLogError(err?.response?.data?.message ?? 'Failed to save record.'),
  });

  return (
    <SafeAreaView style={styles.safe}>
      <LogModal
        visible={showLog}
        type={activeTab}
        onClose={() => { setShowLog(false); setLogError(''); }}
        onSave={createRecord}
        isPending={isPending}
        error={logError}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>HR Records</Text>
        <TouchableOpacity onPress={() => setShowLog(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabRow}>
          {TAB_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, activeTab === t.value && styles.tabActive]}
              onPress={() => setActiveTab(t.value)}
            >
              <Text style={[styles.tabText, activeTab === t.value && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : !data?.length ? (
          <Text style={styles.emptyText}>No {activeTab} records yet. Tap "+ Log" to add one.</Text>
        ) : (
          data.map((rec) => <RecordCard key={rec.id} rec={rec} type={activeTab} />)
        )}
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
  backText:   { fontSize: fontSize.base, fontWeight: '600', color: colors.secondary },
  heading:    { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  addBtn:     { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  addBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textInverse },

  tabScroll: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 44 },
  tabRow:    { flexDirection: 'row', paddingHorizontal: spacing.sm },
  tab:       { paddingHorizontal: spacing.md, paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:   { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  scroll:    { padding: spacing.base, paddingBottom: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

  recCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  recPrimary:  { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  recSecondary:{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  recNotes:    { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});

const modal = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:  { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  cancel: { fontSize: fontSize.base, color: colors.textMuted },
  save:   { fontSize: fontSize.base, fontWeight: '700', color: colors.primary },
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  group:    { marginBottom: spacing.base },
  label:    { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, minHeight: 44,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.base },
  optBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText:      { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  optTextActive:{ color: colors.textInverse },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
});
