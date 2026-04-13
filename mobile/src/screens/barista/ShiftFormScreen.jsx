import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useShiftStore } from '../../stores/shift.store.js';
import { StepProgress } from '../../components/StepProgress.jsx';
import { ChecklistItem } from '../../components/ChecklistItem.jsx';
import { AlertBanner } from '../../components/AlertBanner.jsx';
import { OPENING_CHECKLIST, CLOSING_CHECKLIST } from '../../constants/checklist.js';
import { ALL_DRINK_NAMES } from '../../constants/menu.js';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const TASTE_OPTIONS = [
  { value: 'sour',     label: 'Sour' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'bitter',   label: 'Bitter' },
  { value: 'flat',     label: 'Flat' },
];

// ─── Reusable field components ───────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <Text style={fieldStyles.label}>
      {children}{required && <Text style={{ color: colors.danger }}> *</Text>}
    </Text>
  );
}

function NumberInput({ label, value, onChange, placeholder, required, unit }) {
  return (
    <View style={fieldStyles.group}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View style={fieldStyles.inputRow}>
        <TextInput
          style={[fieldStyles.input, unit && { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.textMuted}
        />
        {unit && <Text style={fieldStyles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={fieldStyles.toggleRow}>
      <Text style={fieldStyles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.textInverse}
      />
    </View>
  );
}

function SegmentControl({ options, value, onChange }) {
  return (
    <View style={fieldStyles.segmentRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[fieldStyles.segment, value === opt.value && fieldStyles.segmentActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[fieldStyles.segmentText, value === opt.value && fieldStyles.segmentTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DrinkPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={fieldStyles.group}>
      <FieldLabel>Most Popular Drink</FieldLabel>
      <TouchableOpacity style={fieldStyles.picker} onPress={() => setOpen(!open)}>
        <Text style={value ? fieldStyles.pickerValue : fieldStyles.pickerPlaceholder}>
          {value || 'Select a drink…'}
        </Text>
        <Text style={fieldStyles.pickerChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={fieldStyles.pickerDropdown}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {ALL_DRINK_NAMES.map((name) => (
              <TouchableOpacity
                key={name}
                style={[fieldStyles.pickerOption, value === name && fieldStyles.pickerOptionActive]}
                onPress={() => { onChange(name); setOpen(false); }}
              >
                <Text style={[fieldStyles.pickerOptionText, value === name && { color: colors.secondary, fontWeight: '700' }]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ draft, update }) {
  const checked = draft.openingChecklist;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to attach opening photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
    if (!result.canceled) update({ openingPhoto: result.assets[0].uri });
  }

  return (
    <View>
      <Text style={styles.stepHeading}>Opening Checklist</Text>
      <Text style={styles.stepSub}>Tap each item to confirm it's done.</Text>
      {OPENING_CHECKLIST.map((item, i) => (
        <ChecklistItem
          key={i}
          label={item}
          checked={!!checked[i]}
          onToggle={() => update({ openingChecklist: { ...checked, [i]: !checked[i] } })}
        />
      ))}
      <NumberInput
        label="Opening Float (NPR)"
        value={draft.openingFloat}
        onChange={(v) => update({ openingFloat: v })}
        placeholder="e.g. 2000"
        unit="NPR"
      />
      <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
        <Text style={styles.photoBtnText}>
          {draft.openingPhoto ? '✓ Photo attached — tap to replace' : '📷  Attach opening photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Step2({ draft, update }) {
  const e = draft.espresso;
  const set = (patch) => update({ espresso: { ...e, ...patch } });

  return (
    <View>
      <Text style={styles.stepHeading}>Espresso Dial-in</Text>
      <Text style={styles.stepSub}>Record your calibration shot details.</Text>

      <NumberInput label="Dose" value={e.dose} onChange={(v) => set({ dose: v })} unit="g" required />
      <NumberInput label="Yield" value={e.yield} onChange={(v) => set({ yield: v })} unit="g" required />
      <NumberInput label="Extraction Time" value={e.extractionTime} onChange={(v) => set({ extractionTime: v })} unit="sec" required />

      <View style={fieldStyles.group}>
        <FieldLabel>Taste Assessment</FieldLabel>
        <SegmentControl
          options={TASTE_OPTIONS}
          value={e.tasteAssessment}
          onChange={(v) => set({ tasteAssessment: v })}
        />
      </View>

      <AlertBanner
        variant={e.tasteAssessment === 'balanced' ? 'success' : 'warning'}
        message={
          e.tasteAssessment === 'sour'     ? 'Sour: try finer grind or longer extraction.' :
          e.tasteAssessment === 'bitter'   ? 'Bitter: try coarser grind or shorter extraction.' :
          e.tasteAssessment === 'flat'     ? 'Flat: check freshness of beans, clean group head.' :
          'Balanced! Good to go for service.'
        }
      />
    </View>
  );
}

function Step3({ draft, update }) {
  const inv = draft.inventory;
  const set = (patch) => update({ inventory: { ...inv, ...patch } });

  return (
    <View>
      <Text style={styles.stepHeading}>Inventory Count</Text>
      <Text style={styles.stepSub}>Record opening and closing stock.</Text>

      <SectionHeader title="Coffee Beans" />
      <TwoColInputs
        labelA="Opening (g)" valueA={inv.beansOpening} onChangeA={(v) => set({ beansOpening: v })}
        labelB="Closing (g)" valueB={inv.beansClosing} onChangeB={(v) => set({ beansClosing: v })}
      />

      <SectionHeader title="Milk (litres)" />
      <TwoColInputs
        labelA="Opening" valueA={inv.milkOpening} onChangeA={(v) => set({ milkOpening: v })}
        labelB="Closing" valueB={inv.milkClosing} onChangeB={(v) => set({ milkClosing: v })}
      />

      <SectionHeader title="Other Stock" />
      <NumberInput label="Ice cream tubs" value={inv.iceCreamTubs} onChange={(v) => set({ iceCreamTubs: v })} />
      <NumberInput label="Cups remaining" value={inv.cupsRemaining} onChange={(v) => set({ cupsRemaining: v })} />
      <NumberInput label="Lids remaining" value={inv.lidsRemaining} onChange={(v) => set({ lidsRemaining: v })} />
      <NumberInput label="Bakery items remaining" value={inv.bakeryRemaining} onChange={(v) => set({ bakeryRemaining: v })} />

      <SectionHeader title="Stock Status" />
      <ToggleRow label="Syrups OK" value={inv.syrupsOk} onChange={(v) => set({ syrupsOk: v })} />
      <ToggleRow label="Boba pearls OK" value={inv.bobaOk} onChange={(v) => set({ bobaOk: v })} />
      <ToggleRow label="Straws OK" value={inv.strawsOk} onChange={(v) => set({ strawsOk: v })} />
    </View>
  );
}

function Step4({ draft, update }) {
  const cash = draft.cash;
  const set  = (patch) => update({ cash: { ...cash, ...patch } });

  const openingF = parseFloat(cash.openingFloat)  || 0;
  const cashS    = parseFloat(cash.cashSales)      || 0;
  const digitalS = parseFloat(cash.digitalSales)   || 0;
  const closingC = parseFloat(cash.closingCash)    || 0;
  const totalS   = cashS + digitalS;
  const expected = openingF + cashS;
  const diff     = closingC - expected;

  return (
    <View>
      <Text style={styles.stepHeading}>Cash Log</Text>
      <Text style={styles.stepSub}>Enter today's cash figures in NPR.</Text>

      <NumberInput label="Opening Float" value={cash.openingFloat} onChange={(v) => set({ openingFloat: v })} unit="NPR" required />
      <NumberInput label="Cash Sales"    value={cash.cashSales}    onChange={(v) => set({ cashSales: v })}    unit="NPR" required />
      <NumberInput label="Digital Sales" value={cash.digitalSales} onChange={(v) => set({ digitalSales: v })} unit="NPR" required />
      <NumberInput label="Closing Cash"  value={cash.closingCash}  onChange={(v) => set({ closingCash: v })}  unit="NPR" required />

      {totalS > 0 && (
        <View style={styles.summaryBox}>
          <Row label="Total Sales"   value={`NPR ${totalS.toLocaleString()}`} />
          <Row label="Expected Cash" value={`NPR ${expected.toLocaleString()}`} />
          <Row
            label="Difference"
            value={`NPR ${diff >= 0 ? '+' : ''}${diff.toLocaleString()}`}
            highlight={Math.abs(diff) > 50}
          />
        </View>
      )}

      {Math.abs(diff) > 50 && totalS > 0 && (
        <AlertBanner variant="danger" message={`Cash discrepancy of NPR ${Math.abs(diff).toLocaleString()} detected. Owner will be notified.`} />
      )}
    </View>
  );
}

function Step5({ draft, update }) {
  const w   = draft.waste;
  const set = (patch) => update({ waste: { ...w, ...patch } });

  return (
    <View>
      <Text style={styles.stepHeading}>Waste Log</Text>
      <Text style={styles.stepSub}>Record any waste during the shift.</Text>

      <NumberInput label="Calibration shots pulled" value={w.calibrationShots} onChange={(v) => set({ calibrationShots: v })} />
      <NumberInput label="Milk wasted (ml)"         value={w.milkWasted}       onChange={(v) => set({ milkWasted: v })}       unit="ml" />
      <NumberInput label="Drinks remade"             value={w.remadeDrinks}     onChange={(v) => set({ remadeDrinks: v })} />
      <NumberInput label="Unsold pastries"           value={w.unsoldPastries}   onChange={(v) => set({ unsoldPastries: v })} />

      <View style={fieldStyles.group}>
        <FieldLabel>Waste Notes</FieldLabel>
        <TextInput
          style={[fieldStyles.input, fieldStyles.textarea]}
          value={w.notes}
          onChangeText={(v) => set({ notes: v })}
          placeholder="Any reasons for waste, equipment issues causing waste…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

function Step6({ draft, update }) {
  const checked = draft.closingChecklist;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to attach closing photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) update({ closingPhoto: result.assets[0].uri });
  }

  const allDone = CLOSING_CHECKLIST.every((_, i) => !!checked[i]);

  return (
    <View>
      <Text style={styles.stepHeading}>Closing Checklist</Text>
      <Text style={styles.stepSub}>Confirm all closing tasks are complete.</Text>
      {CLOSING_CHECKLIST.map((item, i) => (
        <ChecklistItem
          key={i}
          label={item}
          checked={!!checked[i]}
          onToggle={() => update({ closingChecklist: { ...checked, [i]: !checked[i] } })}
        />
      ))}
      {allDone && (
        <AlertBanner variant="success" message="All closing tasks complete!" />
      )}
      <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
        <Text style={styles.photoBtnText}>
          {draft.closingPhoto ? '✓ Photo attached — tap to replace' : '📷  Attach closing photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Step7({ draft, update }) {
  const iss = draft.issues;
  const set = (patch) => update({ issues: { ...iss, ...patch } });

  return (
    <View>
      <Text style={styles.stepHeading}>Issues & Notes</Text>
      <Text style={styles.stepSub}>Summarise the shift and flag any issues.</Text>

      <SectionHeader title="Sales Summary" />
      <NumberInput label="Total drinks served"  value={iss.drinksCount}   onChange={(v) => set({ drinksCount: v })}   required />
      <NumberInput label="Pastries sold"         value={iss.pastriesSold}  onChange={(v) => set({ pastriesSold: v })} />
      <DrinkPicker value={iss.popularDrink} onChange={(v) => set({ popularDrink: v })} />

      <SectionHeader title="Equipment" />
      <ToggleRow label="Equipment issue?" value={iss.equipmentIssue} onChange={(v) => set({ equipmentIssue: v })} />
      {iss.equipmentIssue && (
        <View style={fieldStyles.group}>
          <FieldLabel>Describe the issue</FieldLabel>
          <TextInput
            style={[fieldStyles.input, fieldStyles.textarea]}
            value={iss.equipmentNotes}
            onChangeText={(v) => set({ equipmentNotes: v })}
            placeholder="What happened? Which machine?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <SectionHeader title="Customer Complaints" />
      <ToggleRow label="Any complaints?" value={iss.complaintFlag} onChange={(v) => set({ complaintFlag: v })} />
      {iss.complaintFlag && (
        <View style={fieldStyles.group}>
          <FieldLabel>Describe the complaint</FieldLabel>
          <TextInput
            style={[fieldStyles.input, fieldStyles.textarea]}
            value={iss.complaintNotes}
            onChangeText={(v) => set({ complaintNotes: v })}
            placeholder="What was the complaint? How was it resolved?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <SectionHeader title="Shift Notes" />
      <View style={fieldStyles.group}>
        <TextInput
          style={[fieldStyles.input, fieldStyles.textarea]}
          value={iss.shiftNotes}
          onChangeText={(v) => set({ shiftNotes: v })}
          placeholder="Anything else for the owner or next barista to know…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function TwoColInputs({ labelA, valueA, onChangeA, labelB, valueB, onChangeB }) {
  return (
    <View style={styles.twoCol}>
      <View style={{ flex: 1 }}>
        <NumberInput label={labelA} value={valueA} onChange={onChangeA} />
      </View>
      <View style={{ width: spacing.sm }} />
      <View style={{ flex: 1 }}>
        <NumberInput label={labelB} value={valueB} onChange={onChangeB} />
      </View>
    </View>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && { color: colors.danger, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const STEP_COUNT = 7;

export function ShiftFormScreen({ navigation }) {
  const draft      = useShiftStore((s) => s.draft);
  const updateDraft = useShiftStore((s) => s.updateDraft);
  const setStep    = useShiftStore((s) => s.setStep);
  const submitDraft = useShiftStore((s) => s.submitDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const step = draft.currentStep ?? 1;

  function goNext() {
    if (step < STEP_COUNT) setStep(step + 1);
  }
  function goBack() {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  }

  async function handleSubmit() {
    if (!draft.issues.drinksCount) {
      Alert.alert('Missing info', 'Please enter the total drinks served.');
      return;
    }
    Alert.alert(
      'Submit Shift Report',
      'Once submitted you cannot edit it. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            setSubmitError('');
            try {
              await submitDraft();
              navigation.popToTop();
            } catch (e) {
              setSubmitError(e.message ?? 'Submit failed. Check your connection.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  const isLastStep = step === STEP_COUNT;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Shift Report</Text>
          <View style={{ width: 56 }} />
        </View>

        <StepProgress current={step} total={STEP_COUNT} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && <Step1 draft={draft} update={updateDraft} />}
          {step === 2 && <Step2 draft={draft} update={updateDraft} />}
          {step === 3 && <Step3 draft={draft} update={updateDraft} />}
          {step === 4 && <Step4 draft={draft} update={updateDraft} />}
          {step === 5 && <Step5 draft={draft} update={updateDraft} />}
          {step === 6 && <Step6 draft={draft} update={updateDraft} />}
          {step === 7 && <Step7 draft={draft} update={updateDraft} />}

          {submitError ? <AlertBanner variant="danger" message={submitError} /> : null}
        </ScrollView>

        {/* Bottom nav */}
        <View style={styles.bottomBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={goBack}>
              <Text style={styles.prevBtnText}>← Previous</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {isLastStep ? (
            <TouchableOpacity
              style={[styles.nextBtn, styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.nextBtnText}>{submitting ? 'Submitting…' : 'Submit Report ✓'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fieldStyles = StyleSheet.create({
  group: { marginBottom: spacing.base },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
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
  textarea:   { minHeight: 80, textAlignVertical: 'top' },
  unit:       { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textMuted, width: 36 },
  toggleRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  toggleLabel:{ fontSize: fontSize.base, color: colors.text },
  segmentRow: { flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  segment:    { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surface },
  segmentActive: { backgroundColor: colors.primary },
  segmentText:   { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.textInverse },
  picker: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    minHeight:       44,
  },
  pickerValue:       { fontSize: fontSize.base, color: colors.text },
  pickerPlaceholder: { fontSize: fontSize.base, color: colors.textMuted },
  pickerChevron:     { fontSize: 12, color: colors.textMuted },
  pickerDropdown: {
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    marginTop:       4,
    ...shadow.md,
  },
  pickerOption:       { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionActive: { backgroundColor: colors.primaryLight },
  pickerOptionText:   { fontSize: fontSize.base, color: colors.text },
});

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:   { width: 56 },
  backText:  { fontSize: fontSize.base, color: colors.secondary, fontWeight: '600' },
  topTitle:  { fontSize: fontSize.base, fontWeight: '700', color: colors.text },

  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },

  stepHeading: { fontSize: fontSize.xl,  fontWeight: '700', color: colors.text, marginBottom: 4 },
  stepSub:     { fontSize: fontSize.sm,  color: colors.textMuted, marginBottom: spacing.lg },
  sectionHeader: {
    fontSize:      fontSize.xs,
    fontWeight:    '700',
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop:     spacing.base,
    marginBottom:  spacing.sm,
  },
  twoCol:    { flexDirection: 'row' },

  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginTop:       spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  summaryValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  photoBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius:    radius.md,
    padding:         spacing.md,
    alignItems:      'center',
    marginTop:       spacing.base,
    borderWidth:     1,
    borderColor:     colors.primary,
    borderStyle:     'dashed',
  },
  photoBtnText: { fontSize: fontSize.sm, color: colors.secondary, fontWeight: '600' },

  bottomBar: {
    flexDirection:   'row',
    padding:         spacing.base,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    backgroundColor: colors.background,
    gap:             spacing.sm,
  },
  prevBtn: {
    flex:            1,
    paddingVertical: 14,
    alignItems:      'center',
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border,
    backgroundColor: colors.surface,
  },
  prevBtnText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  nextBtn: {
    flex:            1,
    paddingVertical: 14,
    alignItems:      'center',
    borderRadius:    radius.md,
    backgroundColor: colors.primary,
  },
  submitBtn:   { backgroundColor: colors.secondary },
  nextBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.textInverse },
});
