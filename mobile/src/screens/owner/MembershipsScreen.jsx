import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../../lib/api.js';
import { Badge } from '../../components/Badge.jsx';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const TIERS = [
  { value: 'individual', label: 'Individual', allotment: 20 },
  { value: 'team',       label: 'Team',       allotment: 50 },
  { value: 'corporate',  label: 'Corporate',  allotment: 100 },
  { value: 'enterprise', label: 'Enterprise', allotment: 200 },
];

const TIER_COLORS = {
  individual: colors.primary,
  team:       '#F59E0B',
  corporate:  colors.secondary,
  enterprise: '#7C3AED',
};

const EMPTY_FORM = {
  companyName: '', contactPerson: '', whatsapp: '',
  tier: 'team', staffCount: '', monthlyFee: '', renewalDate: '',
};

function TierBadge({ tier }) {
  const color = TIER_COLORS[tier] ?? colors.textMuted;
  const label = TIERS.find((t) => t.value === tier)?.label ?? tier;
  return (
    <View style={[styles.tierBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
      <Text style={[styles.tierBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function DrinksBar({ used, remaining }) {
  const total = (used ?? 0) + (remaining ?? 0);
  const pct   = total > 0 ? Math.min(((used ?? 0) / total) * 100, 100) : 0;
  return (
    <View style={styles.drinksRow}>
      <View style={styles.drinksTrack}>
        <View style={[styles.drinksFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.drinksText}>{used ?? 0} / {total} used</Text>
    </View>
  );
}

function AddModal({ visible, onClose, onSave, isPending, error }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function handleSubmit() {
    onSave({
      companyName:   form.companyName.trim(),
      contactPerson: form.contactPerson.trim(),
      whatsapp:      form.whatsapp.trim(),
      tier:          form.tier,
      staffCount:    parseInt(form.staffCount)    || undefined,
      monthlyFee:    parseFloat(form.monthlyFee)  || undefined,
      renewalDate:   form.renewalDate             || undefined,
      status:        'active',
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={modal.header}>
            <TouchableOpacity onPress={onClose}><Text style={modal.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={modal.title}>Add Membership</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
              <Text style={[modal.save, isPending && { opacity: 0.5 }]}>{isPending ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modal.scroll} keyboardShouldPersistTaps="handled">
            {error ? <AlertBanner variant="danger" message={error} /> : null}
            <Field label="Company / Name *" value={form.companyName}   onChange={(v) => set({ companyName: v })}   placeholder="e.g. Kathmandu Corp" />
            <Field label="Contact Person"   value={form.contactPerson} onChange={(v) => set({ contactPerson: v })} placeholder="Full name" />
            <Field label="WhatsApp Number"  value={form.whatsapp}      onChange={(v) => set({ whatsapp: v })}      placeholder="+977 98XXXXXXXX" keyboardType="phone-pad" />
            <Field label="Monthly Fee (NPR)" value={form.monthlyFee}   onChange={(v) => set({ monthlyFee: v })}    keyboardType="decimal-pad" />
            <Field label="Staff Count"      value={form.staffCount}    onChange={(v) => set({ staffCount: v })}    keyboardType="number-pad" />
            <Field label="Renewal Date"     value={form.renewalDate}   onChange={(v) => set({ renewalDate: v })}   placeholder="YYYY-MM-DD" />

            <Text style={modal.tierLabel}>Tier</Text>
            <View style={modal.tierRow}>
              {TIERS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[modal.tierBtn, form.tier === t.value && { backgroundColor: TIER_COLORS[t.value], borderColor: TIER_COLORS[t.value] }]}
                  onPress={() => set({ tier: t.value })}
                >
                  <Text style={[modal.tierBtnText, form.tier === t.value && { color: colors.textInverse }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }) {
  return (
    <View style={modal.group}>
      <Text style={modal.fieldLabel}>{label}</Text>
      <TextInput
        style={modal.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export function MembershipsScreen({ navigation }) {
  const [showAdd, setShowAdd]   = useState(false);
  const [addError, setAddError] = useState('');
  const qc = useQueryClient();

  const { data: memberships, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => membershipApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: addMember, isPending } = useMutation({
    mutationFn: (data) => membershipApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberships'] });
      setShowAdd(false);
      setAddError('');
    },
    onError: (err) => setAddError(err?.response?.data?.message ?? 'Failed to add membership.'),
  });

  const active  = memberships?.filter((m) => m.status === 'active')  ?? [];
  const others  = memberships?.filter((m) => m.status !== 'active')  ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <AddModal
        visible={showAdd}
        onClose={() => { setShowAdd(false); setAddError(''); }}
        onSave={addMember}
        isPending={isPending}
        error={addError}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Memberships</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : !memberships?.length ? (
          <Text style={styles.emptyText}>No memberships yet. Tap "+ Add" to create one.</Text>
        ) : (
          <>
            {active.length > 0 && <Text style={styles.groupLabel}>Active ({active.length})</Text>}
            {active.map((m) => <MemberCard key={m.id} m={m} onPress={() => navigation.navigate('MembershipDetail', { membership: m })} />)}
            {others.length > 0 && <Text style={styles.groupLabel}>Inactive ({others.length})</Text>}
            {others.map((m) => <MemberCard key={m.id} m={m} onPress={() => navigation.navigate('MembershipDetail', { membership: m })} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberCard({ m, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.company}>{m.companyName}</Text>
          {m.contactPerson && <Text style={styles.contact}>{m.contactPerson}</Text>}
        </View>
        <View style={styles.cardBadges}>
          <TierBadge tier={m.tier} />
          <Badge variant={m.status} />
        </View>
      </View>
      <DrinksBar used={m.drinksUsed} remaining={m.drinksRemaining} />
      {m.monthlyFee && (
        <Text style={styles.fee}>NPR {Number(m.monthlyFee).toLocaleString()} / month</Text>
      )}
    </TouchableOpacity>
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

  scroll:     { padding: spacing.base, paddingBottom: spacing['3xl'] },
  emptyText:  { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  groupLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardBadges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 140 },
  company:    { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  contact:    { fontSize: fontSize.sm, color: colors.textMuted },
  fee:        { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },

  tierBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  tierBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },

  drinksRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  drinksTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  drinksFill:  { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  drinksText:  { fontSize: fontSize.xs, color: colors.textMuted, width: 80, textAlign: 'right' },
});

const modal = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:    { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  cancel:   { fontSize: fontSize.base, color: colors.textMuted },
  save:     { fontSize: fontSize.base, fontWeight: '700', color: colors.primary },
  scroll:   { padding: spacing.base, paddingBottom: spacing['3xl'] },
  group:    { marginBottom: spacing.base },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, minHeight: 44,
  },
  tierLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  tierRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tierBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  tierBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
});
