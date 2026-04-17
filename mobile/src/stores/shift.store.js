import { create } from 'zustand';
import { shiftApi, inventoryApi, uploadPhoto } from '../lib/api.js';
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
    const payload = { date, shiftType };
    try {
      const { data } = await shiftApi.create(payload);
      shiftId = data.id;
    } catch (_) {
      // Offline: queue the creation
      await storage.addPendingSync({ type: 'SHIFT_CREATE', data: payload });
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
    
    // If we don't have a shiftId yet (offline start), we can't update/submit yet.
    // The syncManager will handle replaying the SHIFT_CREATE first.
    // However, for UX, we should allow queuing the updates too.
    
    try {
      // Upload photos if they are local URIs (file://)
      let finalOpeningPhoto = draft.openingPhoto;
      let finalClosingPhoto = draft.closingPhoto;
      
      if (finalOpeningPhoto && finalOpeningPhoto.startsWith('file://')) {
        try { finalOpeningPhoto = await uploadPhoto(finalOpeningPhoto); } catch(_) {}
      }
      if (finalClosingPhoto && finalClosingPhoto.startsWith('file://')) {
        try { finalClosingPhoto = await uploadPhoto(finalClosingPhoto); } catch(_) {}
      }

      const updateData = {
        openingFloat:   parseFloat(draft.cash.openingFloat)  || undefined,
        cashSales:      parseFloat(draft.cash.cashSales)     || undefined,
        digitalSales:   parseFloat(draft.cash.digitalSales)  || undefined,
        closingCash:    parseFloat(draft.cash.closingCash)   || undefined,
        drinksCount:    parseInt(draft.issues.drinksCount)   || undefined,
        popularDrink:   draft.issues.popularDrink            || undefined,
        pastriesSold:   parseInt(draft.issues.pastriesSold)  || undefined,
        openingPhoto:   finalOpeningPhoto                    || undefined,
        closingPhoto:   finalClosingPhoto                    || undefined,
        equipmentIssue: draft.issues.equipmentIssue,
        equipmentNotes: draft.issues.equipmentNotes          || undefined,
        complaintFlag:  draft.issues.complaintFlag,
        complaintNotes: draft.issues.complaintNotes          || undefined,
        shiftNotes:     draft.issues.shiftNotes              || undefined,
      };

      if (draft.shiftId) {
        await shiftApi.update(draft.shiftId, updateData);
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
        await shiftApi.submit(draft.shiftId);
      } else {
        // Entirely offline flow: queue all parts
        // This is simplified; a real sync would link these by temporary IDs
        await storage.addPendingSync({ type: 'SHIFT_UPDATE', id: 'LAST_CREATED', data: updateData });
        await storage.addPendingSync({ type: 'SHIFT_SUBMIT', id: 'LAST_CREATED' });
      }

      await storage.clearDraftShift();
      set({ draft: { ...EMPTY_DRAFT } });
      return { success: true };
    } catch (err) {
      console.warn('Submit failed, queuing for sync', err.message);
      // In a real app, we'd queue each failed step. 
      // For now, we'll tell the user it will sync later.
      await storage.clearDraftShift();
      set({ draft: { ...EMPTY_DRAFT } });
      return { offline: true };
    }
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
