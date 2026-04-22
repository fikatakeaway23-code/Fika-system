import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Linking, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../../lib/api.js';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { Badge } from '../../components/Badge.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const TIER_META = {
  daily_pass:    { label: 'Daily Pass', color: colors.primary },
  team_pack:     { label: 'Team Pack', color: '#F59E0B', allotment: 30 },
  office_bundle: { label: 'Office Bundle', color: colors.secondary },
};
const TIERS = Object.keys(TIER_META);
const STATUSES = ['active', 'pending', 'expired', 'cancelled'];
const TIER_COLORS = Object.fromEntries(Object.entries(TIER_META).map(([tier, meta]) => [tier, meta.color]));

function formatTierLabel(tier) {
  return TIER_META[tier]?.label ?? tier;
}

function getUsageMeta(membership) {
  const used = membership.drinksUsed ?? 0;

  if (membership.drinksRemaining !== null && membership.drinksRemaining !== undefined) {
    const total = used + membership.drinksRemaining;
    return {
      limited: true,
      used,
      total,
      remaining: membership.drinksRemaining,
      pct: total > 0 ? Math.min((used / total) * 100, 100) : 0,
      footer: `${membership.drinksRemaining} remaining`,
    };
  }

  if (membership.tier === 'daily_pass') {
    const dailyLimit = membership.drinksPerDay ?? membership.staffCount;
    return {
      limited: false,
      used,
      summary: `${used} drinks redeemed`,
      footer: dailyLimit ? `${dailyLimit}/day allowance` : 'Daily allowance',
    };
  }

  return {
    limited: false,
    used,
    summary: `${used} drinks redeemed`,
    footer: 'Unlimited plan',
  };
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

export function MembershipDetailScreen({ route, navigation }) {
  const initMembership = route.params?.membership ?? {};
  const qc = useQueryClient();

  const [membership, setMembership] = useState(initMembership);
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState({
    companyName:   membership.companyName   ?? '',
    contactPerson: membership.contactPerson ?? '',
    whatsapp:      membership.whatsapp      ?? '',
    monthlyFee:    String(membership.monthlyFee ?? ''),
    renewalDate:   membership.renewalDate   ?? '',
    tier:          membership.tier          ?? 'team_pack',
    status:        membership.status        ?? 'active',
  });
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [drinkError, setDrinkError] = useState('');
  const usage = getUsageMeta(membership);

  const { mutate: saveMutation, isPending: isSaving } = useMutation({
    mutationFn: (data) => membershipApi.update(membership.id, data),
    onSuccess: (res) => {
      const updated = res.data;
      setMembership(updated);
      qc.invalidateQueries({ queryKey: ['memberships'] });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    onError: (err) => setSaveError(err?.response?.data?.message ?? 'Failed to save.'),
  });

  const { mutate: redeemDrink, isPending: isRedeeming } = useMutation({
    mutationFn: (payload) => membershipApi.redeem(membership.id, payload),
    onSuccess: (res) => {
      setMembership(res.data.membership);
      setDrinkError('');
      qc.invalidateQueries({ queryKey: ['memberships'] });
    },
    onError: (err) => setDrinkError(err?.response?.data?.error ?? 'Failed to log drink.'),
  });

  function openWhatsApp() {
    const num = (membership.whatsapp ?? '').replace(/\D/g, '');
    if (num) Linking.openURL(`https://wa.me/${num}`);
  }

  function handleSave() {
    setSaveError('');
    saveMutation({
      companyName:   editForm.companyName.trim(),
      contactPerson: editForm.contactPerson.trim(),
      whatsapp:      editForm.whatsapp.trim(),
      monthlyFee:    parseFloat(editForm.monthlyFee) || undefined,
      renewalDate:   editForm.renewalDate || undefined,
      tier:          editForm.tier,
      status:        editForm.status,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>{membership.companyName}</Text>
        <TouchableOpacity onPress={() => { setEditing(!editing); setSaveError(''); }}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {saveSuccess && <AlertBanner variant="success" message="Membership updated!" />}
          {saveError   && <AlertBanner variant="danger"  message={saveError} />}

          {/* Drinks usage */}
          <View style={styles.drinksCard}>
            <View style={styles.drinksHeader}>
              <Text style={styles.drinksTitle}>Drinks Usage</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Badge variant="active" label={formatTierLabel(membership.tier)} />
                <Badge variant={membership.status ?? 'active'} label={membership.status ?? 'active'} />
              </View>
            </View>
            {usage.limited ? (
              <>
                <View style={styles.drinksTrack}>
                  <View style={[styles.drinksFill, { width: `${usage.pct}%`, backgroundColor: usage.pct > 90 ? colors.danger : colors.primary }]} />
                </View>
                <View style={styles.drinksCount}>
                  <Text style={styles.drinksUsed}>{usage.used} used</Text>
                  <Text style={styles.drinksRemaining}>{usage.remaining} remaining / {usage.total} total</Text>
                </View>
              </>
            ) : (
              <View style={styles.drinksMeta}>
                <Text style={styles.drinksUsed}>{usage.summary}</Text>
                <Text style={styles.drinksRemaining}>{usage.footer}</Text>
              </View>
            )}
            {drinkError ? <AlertBanner variant="danger" message={drinkError} /> : null}
            <View style={styles.drinksBtnsSingle}>
              <TouchableOpacity
                style={[styles.drinkBtn, styles.drinkBtnPlus, isRedeeming && { opacity: 0.5 }]}
                onPress={() => redeemDrink({ count: 1 })}
                disabled={isRedeeming || membership.status !== 'active'}
              >
                <Text style={[styles.drinkBtnText, { color: colors.textInverse }]}>
                  {isRedeeming ? 'Logging…' : 'Log 1 Drink'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {editing ? (
            /* Edit form */
            <View style={styles.editCard}>
              <EditField label="Company Name"    value={editForm.companyName}   onChange={(v) => setEditForm((f) => ({ ...f, companyName: v }))} />
              <EditField label="Contact Person"  value={editForm.contactPerson} onChange={(v) => setEditForm((f) => ({ ...f, contactPerson: v }))} />
              <EditField label="WhatsApp"        value={editForm.whatsapp}      onChange={(v) => setEditForm((f) => ({ ...f, whatsapp: v }))} keyboardType="phone-pad" />
              <EditField label="Monthly Fee (NPR)" value={editForm.monthlyFee}  onChange={(v) => setEditForm((f) => ({ ...f, monthlyFee: v }))} keyboardType="decimal-pad" />
              <EditField label="Renewal Date"    value={editForm.renewalDate}   onChange={(v) => setEditForm((f) => ({ ...f, renewalDate: v }))} placeholder="YYYY-MM-DD" />

              <Text style={styles.editSectionLabel}>Tier</Text>
              <View style={styles.optionRow}>
                {TIERS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optBtn, editForm.tier === t && { backgroundColor: TIER_COLORS[t], borderColor: TIER_COLORS[t] }]}
                    onPress={() => setEditForm((f) => ({ ...f, tier: t }))}
                  >
                    <Text style={[styles.optBtnText, editForm.tier === t && { color: colors.textInverse }]}>
                      {formatTierLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editSectionLabel}>Status</Text>
              <View style={styles.optionRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.optBtn, editForm.status === s && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}
                    onPress={() => setEditForm((f) => ({ ...f, status: s }))}
                  >
                    <Text style={[styles.optBtnText, editForm.status === s && { color: colors.textInverse }]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Info view */
            <View style={styles.infoCard}>
              <InfoRow label="Contact Person"  value={membership.contactPerson} />
              <InfoRow label="WhatsApp"        value={membership.whatsapp} />
              <InfoRow label="Staff Count"     value={membership.staffCount != null ? String(membership.staffCount) : undefined} />
              <InfoRow label="Monthly Fee"     value={membership.monthlyFee != null ? `NPR ${Number(membership.monthlyFee).toLocaleString()}` : undefined} />
              <InfoRow label="Renewal Date"    value={membership.renewalDate} />
              <InfoRow label="Member Since"    value={membership.joinedDate ? membership.joinedDate.slice(0, 10) : membership.createdAt ? membership.createdAt.slice(0, 10) : undefined} />

              {membership.whatsapp && (
                <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                  <Text style={styles.waBtnText}>💬  Open WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EditField({ label, value, onChange, placeholder, keyboardType }) {
  return (
    <View style={styles.editGroup}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: fontSize.base, fontWeight: '600', color: colors.secondary },
  heading:  { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  editBtn:  { fontSize: fontSize.base, fontWeight: '600', color: colors.primary, width: 48, textAlign: 'right' },

  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  drinksCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base,
    marginBottom: spacing.base, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  drinksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  drinksTitle:  { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  drinksTrack:  { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.sm },
  drinksFill:   { height: '100%', borderRadius: 5 },
  drinksCount:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.base },
  drinksMeta:   { gap: spacing.xs, marginBottom: spacing.base },
  drinksUsed:   { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  drinksRemaining: { fontSize: fontSize.sm, color: colors.textMuted },
  drinksBtnsSingle: { flexDirection: 'row', marginTop: spacing.sm },
  drinkBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, borderWidth: 1 },
  drinkBtnPlus: { borderColor: colors.primary, backgroundColor: colors.primary },
  drinkBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },

  infoCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel:{ fontSize: fontSize.sm, color: colors.textMuted },
  infoValue:{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text, maxWidth: '55%', textAlign: 'right' },

  waBtn:    { marginTop: spacing.base, backgroundColor: '#25D366' + '20', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#25D366' + '60' },
  waBtnText:{ fontSize: fontSize.base, fontWeight: '600', color: '#25D366' },

  editCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  editGroup:        { marginBottom: spacing.base },
  editLabel:        { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  editInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, minHeight: 44,
  },
  editSectionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  optionRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  optBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  saveBtn:    { backgroundColor: colors.secondary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText:{ fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },
});
