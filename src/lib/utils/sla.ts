/**
 * SLA (Service-Level Agreement) Utility for BEMMS Tickets
 *
 * Implements response and resolution target calculations based on priority
 * per clinical engineering standards and BEMMS documentation.
 */

export interface SlaPriorityConfig {
  responseMinutes: number;
  resolutionMinutes: number;
  label: string;
}

export const SLA_CONFIG: Record<string, SlaPriorityConfig> = {
  p1_critical: {
    responseMinutes: 60, // 1 hour
    resolutionMinutes: 240, // 4 hours
    label: 'Critical (P1)',
  },
  p2_high: {
    responseMinutes: 120, // 2 hours
    resolutionMinutes: 1440, // 24 hours (1 day)
    label: 'High (P2)',
  },
  p3_normal: {
    responseMinutes: 480, // 8 hours
    resolutionMinutes: 4320, // 72 hours (3 days)
    label: 'Normal (P3)',
  },
  p4_low: {
    responseMinutes: 1440, // 24 hours
    resolutionMinutes: 10080, // 168 hours (7 days)
    label: 'Low (P4)',
  },
};

export type SlaStatus = 'on_track' | 'due_soon' | 'breached' | 'met' | 'unknown';

export interface SlaTargetInfo {
  targetAt: Date | null;
  status: SlaStatus;
  remainingMinutes: number;
  formattedRemaining: string;
  isBreached: boolean;
}

/**
 * Calculates response and resolution target timestamps from a starting date based on priority.
 */
export function calculateSlaTargets(
  priorityCode: string | null | undefined,
  baseDate: Date = new Date()
): { responseTargetAt: Date; resolutionTargetAt: Date } {
  const config = SLA_CONFIG[priorityCode || 'p3_normal'] || SLA_CONFIG.p3_normal;
  const baseTime = baseDate.getTime();
  return {
    responseTargetAt: new Date(baseTime + config.responseMinutes * 60 * 1000),
    resolutionTargetAt: new Date(baseTime + config.resolutionMinutes * 60 * 1000),
  };
}

/**
 * Evaluates whether an SLA target is on track, due soon, breached, or met.
 */
export function evaluateSla(
  targetAt: Date | string | null | undefined,
  completedAt?: Date | string | null | undefined,
  now: Date = new Date()
): SlaTargetInfo {
  if (!targetAt) {
    return {
      targetAt: null,
      status: 'unknown',
      remainingMinutes: 0,
      formattedRemaining: '—',
      isBreached: false,
    };
  }

  const targetDate = new Date(targetAt);
  const targetTime = targetDate.getTime();

  if (completedAt) {
    const completedTime = new Date(completedAt).getTime();
    const met = completedTime <= targetTime;
    return {
      targetAt: targetDate,
      status: met ? 'met' : 'breached',
      remainingMinutes: Math.round((targetTime - completedTime) / (60 * 1000)),
      formattedRemaining: met ? 'Met' : 'Breached',
      isBreached: !met,
    };
  }

  const currentTime = now.getTime();
  const diffMs = targetTime - currentTime;
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (diffMinutes <= 0) {
    const overdueMins = Math.abs(diffMinutes);
    const overdueHours = Math.floor(overdueMins / 60);
    const overdueDays = Math.floor(overdueHours / 24);
    const text = overdueDays > 0
      ? `${overdueDays}d overdue`
      : overdueHours > 0
      ? `${overdueHours}h overdue`
      : `${overdueMins}m overdue`;
    return {
      targetAt: targetDate,
      status: 'breached',
      remainingMinutes: diffMinutes,
      formattedRemaining: text,
      isBreached: true,
    };
  }

  const isDueSoon = diffMinutes <= 60;
  const remHours = Math.floor(diffMinutes / 60);
  const remDays = Math.floor(remHours / 24);
  const text = remDays > 0
    ? `${remDays}d left`
    : remHours > 0
    ? `${remHours}h left`
    : `${diffMinutes}m left`;

  return {
    targetAt: targetDate,
    status: isDueSoon ? 'due_soon' : 'on_track',
    remainingMinutes: diffMinutes,
    formattedRemaining: text,
    isBreached: false,
  };
}
