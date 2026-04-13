import React from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { format } from 'date-fns';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

function InfoRow({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

export function DiscrepancyScreen({ route, navigation }) {
  const record = route.params?.record ?? {};

  const posTotal    = Number(record.posTotal    ?? 0);
  const posCash     = Number(record.posCash     ?? 0);
  const posDigital  = Number(record.posDigital  ?? 0);
  const barCash     = Number(record.baristaCashReported    ?? 0);
  const barDigital  = Number(record.baristaDigitalReported ?? 0);
  const discrepancy = Number(record.cashDiscrepancy ?? barCash - posCash);
  const absDisc     = Math.abs(discrepancy);
  const isShort     = discrepancy < 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Finance</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Discrepancy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.date}>
          {record.date ? format(new Date(record.date), 'EEEE, d MMMM yyyy') : 'Today'}
        </Text>

        <AlertBanner
          variant="danger"
          message={`Cash ${isShort ? 'short' : 'over'} by NPR ${absDisc.toLocaleString()}. Review and reconcile with barista.`}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>POS System</Text>
          <InfoRow label="POS Total"   value={`NPR ${posTotal.toLocaleString()}`} />
          <InfoRow label="POS Cash"    value={`NPR ${posCash.toLocaleString()}`} />
          <InfoRow label="POS Digital" value={`NPR ${posDigital.toLocaleString()}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Barista Reported</Text>
          <InfoRow label="Cash Collected"    value={`NPR ${barCash.toLocaleString()}`} />
          <InfoRow label="Digital Confirmed" value={`NPR ${barDigital.toLocaleString()}`} />
        </View>

        <View style={[styles.card, styles.diffCard]}>
          <Text style={styles.cardTitle}>Reconciliation</Text>
          <InfoRow label="Expected Cash"  value={`NPR ${posCash.toLocaleString()}`} />
          <InfoRow label="Actual Cash"    value={`NPR ${barCash.toLocaleString()}`} />
          <InfoRow
            label="Discrepancy"
            value={`NPR ${discrepancy >= 0 ? '+' : ''}${discrepancy.toLocaleString()}`}
            highlight
          />
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>What to do</Text>
          {isShort ? (
            <>
              <Text style={styles.guideItem}>• Check if any cash sales were missed in the POS.</Text>
              <Text style={styles.guideItem}>• Verify the barista's closing cash count.</Text>
              <Text style={styles.guideItem}>• Check for any refunds or voids not recorded.</Text>
            </>
          ) : (
            <>
              <Text style={styles.guideItem}>• Extra cash in drawer — may be from tips or a POS void.</Text>
              <Text style={styles.guideItem}>• Verify no digital payments were accidentally counted twice.</Text>
            </>
          )}
          <Text style={styles.guideItem}>• Document the resolution in the shift notes.</Text>
        </View>

        <TouchableOpacity style={styles.ackBtn} onPress={() => navigation.popToTop()}>
          <Text style={styles.ackBtnText}>Acknowledge & Return to Finance</Text>
        </TouchableOpacity>
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
  scroll:   { padding: spacing.base, paddingBottom: spacing['3xl'] },
  date:     { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.base },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.base,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  diffCard:  { borderColor: colors.danger + '40', backgroundColor: colors.danger + '08' },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },

  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  rowValueHighlight: { color: colors.danger, fontSize: fontSize.base, fontWeight: '700' },

  guideCard: {
    backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base,
    marginBottom: spacing.base, borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  guideTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary, marginBottom: spacing.sm },
  guideItem:  { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },

  ackBtn: {
    backgroundColor: colors.secondary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  ackBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },
});
