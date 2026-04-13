import { create } from 'zustand';
import { shiftApi, inventoryApi } from '../lib/api.js';
import { storage } from '../lib/storage.js';

const EMPTY_DRAFT = {
  shiftId:     null,
  currentStep: 1,
  date:        null,
  shiftType:   null,

  // Step 1 — Opening checklist
  openingChecklist: {},
  openingPhoto:     null,
  openingFloat:     '',

  // Step 2 — Espresso
  espresso: { dose: '', yield: '', extractionTime: '', tasteAssessment: 'balanced' },

  // Step 3 — Inventory
  inventory: {
    beansOpening: '', beansClosing: '',
    milkOpening:  '', milkClosing:  '',
    syrupsOk: true, iceCreamTubs: '', bobaOk: true,
    cupsRemaining: '', lidsRemaining: '', strawsOk: true, bakeryRemaining: '',
  },

  // Step 4 — Cash
  cash: { openingFloat: '', cashSales: '', digitalSales: '', closingCash: '' },

  // Step 5 — Waste
  waste: { calibrationShots: '', milkWasted: '', remadeDrinks: '', unsoldPastries: '', notes: '' },

  // Step 6 — Closing checklist
  closingChecklist: {},
  closingPhoto:     null,

  // Step 7 — Issues
  issues: {
    equipmentIssue: false, equipmentNotes: '',
    complaintFlag:  false, complaintNotes: '',
    shiftNotes: '',
    drinksCount: '', popularDrink: '', pastriesSold: '',
  },
};

export const useShiftStore = create((set, get) => ({
  draft: { ...EMPTY_DRAFT },

  async initDraft(date, shiftType) {
    const existing = await storage.getDraftShift();
    if (existing?.date === date && existing?.shiftType === shiftType) {
      set({ draft: existing });
      return existing;
    }

    // Create shift on backend, get ID
    let shiftId = null;
    try {
      const { data } = await shiftApi.create({ date, shiftType });
      shiftId = data.id;
    } catch (_) {
      // Offline: will sync later
    }

    const draft = { ...EMPTY_DRAFT, date, shiftType, shiftId };
    set({ draft });
    await storage.saveDraftShift(draft);
    return draft;
  },

  async updateDraft(patch) {
    const updated = { ...get().draft, ...patch };
    set({ draft: updated });
    await storage.saveDraftShift(updated);
  },

  setStep(step) {
    set((s) => ({ draft: { ...s.draft, currentStep: step } }));
  },

  async submitDraft() {
    const draft = get().draft;
    if (!draft.shiftId) throw new Error('No shift ID — check connectivity');

    // Update shift fields
    await shiftApi.update(draft.shiftId, {
      openingFloat:   parseFloat(draft.cash.openingFloat)  || undefined,
      cashSales:      parseFloat(draft.cash.cashSales)     || undefined,
      digitalSales:   parseFloat(draft.cash.digitalSales)  || undefined,
      closingCash:    parseFloat(draft.cash.closingCash)   || undefined,
      drinksCount:    parseInt(draft.issues.drinksCount)   || undefined,
      popularDrink:   draft.issues.popularDrink            || undefined,
      pastriesSold:   parseInt(draft.issues.pastriesSold)  || undefined,
      openingPhoto:   draft.openingPhoto                   || undefined,
      closingPhoto:   draft.closingPhoto                   || undefined,
      equipmentIssue: draft.issues.equipmentIssue,
      equipmentNotes: draft.issues.equipmentNotes          || undefined,
      complaintFlag:  draft.issues.complaintFlag,
      complaintNotes: draft.issues.complaintNotes          || undefined,
      shiftNotes:     draft.issues.shiftNotes              || undefined,
    });

    // Inventory
    await inventoryApi.upsert({ type: 'inventory', shiftId: draft.shiftId, ...parsedNumbers(draft.inventory) });
    await inventoryApi.upsert({ type: 'waste',     shiftId: draft.shiftId, ...parsedNumbers(draft.waste) });
    await inventoryApi.upsert({
      type:            'espresso',
      shiftId:          draft.shiftId,
      dose:            parseFloat(draft.espresso.dose)           || undefined,
      yield:           parseFloat(draft.espresso.yield)          || undefined,
      extractionTime:  parseInt(draft.espresso.extractionTime)   || undefined,
      tasteAssessment: draft.espresso.tasteAssessment            || undefined,
    });

    // Submit
    const { data } = await shiftApi.submit(draft.shiftId);

    await storage.clearDraftShift();
    set({ draft: { ...EMPTY_DRAFT } });
    return data;
  },

  resetDraft() {
    set({ draft: { ...EMPTY_DRAFT } });
    storage.clearDraftShift();
  },
}));

function parsedNumbers(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      const n = parseFloat(v);
      out[k] = isNaN(n) ? undefined : n;
    } else {
      out[k] = v;
    }
  }
  return out;
}
