import { describe, it, expect } from 'vitest';
import { calculateSlaTargets, evaluateSla, SLA_CONFIG } from '../sla';

describe('SLA Utility', () => {
  describe('calculateSlaTargets', () => {
    it('calculates P1 critical targets correctly (1h response, 4h resolution)', () => {
      const now = new Date('2026-11-07T10:00:00Z');
      const targets = calculateSlaTargets('p1_critical', now);

      expect(targets.responseTargetAt.toISOString()).toBe('2026-11-07T11:00:00.000Z');
      expect(targets.resolutionTargetAt.toISOString()).toBe('2026-11-07T14:00:00.000Z');
    });

    it('calculates P2 high targets correctly (2h response, 24h resolution)', () => {
      const now = new Date('2026-11-07T10:00:00Z');
      const targets = calculateSlaTargets('p2_high', now);

      expect(targets.responseTargetAt.toISOString()).toBe('2026-11-07T12:00:00.000Z');
      expect(targets.resolutionTargetAt.toISOString()).toBe('2026-11-08T10:00:00.000Z');
    });

    it('calculates P3 normal targets correctly (8h response, 72h resolution)', () => {
      const now = new Date('2026-11-07T10:00:00Z');
      const targets = calculateSlaTargets('p3_normal', now);

      expect(targets.responseTargetAt.toISOString()).toBe('2026-11-07T18:00:00.000Z');
      expect(targets.resolutionTargetAt.toISOString()).toBe('2026-11-10T10:00:00.000Z');
    });

    it('calculates P4 low targets correctly (24h response, 7d resolution)', () => {
      const now = new Date('2026-11-07T10:00:00Z');
      const targets = calculateSlaTargets('p4_low', now);

      expect(targets.responseTargetAt.toISOString()).toBe('2026-11-08T10:00:00.000Z');
      expect(targets.resolutionTargetAt.toISOString()).toBe('2026-11-14T10:00:00.000Z');
    });

    it('defaults to P3 normal when priority is undefined or unknown', () => {
      const now = new Date('2026-11-07T10:00:00Z');
      const targets = calculateSlaTargets(undefined, now);

      expect(targets.responseTargetAt.toISOString()).toBe('2026-11-07T18:00:00.000Z');
    });
  });

  describe('evaluateSla', () => {
    it('returns unknown when targetAt is null or undefined', () => {
      const result = evaluateSla(null);
      expect(result.status).toBe('unknown');
      expect(result.isBreached).toBe(false);
    });

    it('detects on_track when plenty of time remains', () => {
      const target = new Date('2026-11-07T16:00:00Z');
      const now = new Date('2026-11-07T10:00:00Z');
      const result = evaluateSla(target, null, now);

      expect(result.status).toBe('on_track');
      expect(result.isBreached).toBe(false);
      expect(result.formattedRemaining).toBe('6h left');
    });

    it('detects due_soon when less than 1 hour remains', () => {
      const target = new Date('2026-11-07T10:45:00Z');
      const now = new Date('2026-11-07T10:00:00Z');
      const result = evaluateSla(target, null, now);

      expect(result.status).toBe('due_soon');
      expect(result.isBreached).toBe(false);
      expect(result.formattedRemaining).toBe('45m left');
    });

    it('detects breached when target time has passed', () => {
      const target = new Date('2026-11-07T09:00:00Z');
      const now = new Date('2026-11-07T10:00:00Z');
      const result = evaluateSla(target, null, now);

      expect(result.status).toBe('breached');
      expect(result.isBreached).toBe(true);
      expect(result.formattedRemaining).toBe('1h overdue');
    });

    it('detects met when completed before target', () => {
      const target = new Date('2026-11-07T12:00:00Z');
      const completed = new Date('2026-11-07T11:30:00Z');
      const result = evaluateSla(target, completed);

      expect(result.status).toBe('met');
      expect(result.isBreached).toBe(false);
      expect(result.formattedRemaining).toBe('Met');
    });

    it('detects breached when completed after target', () => {
      const target = new Date('2026-11-07T12:00:00Z');
      const completed = new Date('2026-11-07T12:30:00Z');
      const result = evaluateSla(target, completed);

      expect(result.status).toBe('breached');
      expect(result.isBreached).toBe(true);
      expect(result.formattedRemaining).toBe('Breached');
    });
  });
});
