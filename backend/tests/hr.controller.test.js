import { describe, it, expect } from 'vitest';
import { hrSchema } from '../src/controllers/hr.controller.js';

describe('HR Controller - hrSchema validation', () => {
  it('validates a valid attendance record', () => {
    const validData = {
      staffMember: 'user_123',
      recordType: 'attendance',
      date: '2026-04-17',
      arrivalTime: '09:05',
      latenessCategory: 'minor',
      shift: 'am',
    };
    const result = hrSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid date format', () => {
    const invalidData = {
      staffMember: 'user_123',
      recordType: 'attendance',
      date: '04/17/2026', // wrong format
    };
    const result = hrSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid recordType', () => {
    const invalidData = {
      staffMember: 'user_123',
      recordType: 'invalid_type',
      date: '2026-04-17',
    };
    const result = hrSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates a valid incident record', () => {
    const validData = {
      staffMember: 'user_123',
      recordType: 'incident',
      date: '2026-04-17',
      incidentType: 'breakage',
      damageCost: 500,
      deductionApplied: 250,
      warningIssued: true,
      notes: 'Dropped a mug',
    };
    const result = hrSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
