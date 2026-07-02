export type SlotType = 'standard' | 'extended';

export const SLOT_TYPES: Record<SlotType, { cost: number; includedMinutes: number }> = {
  standard: { cost: 50, includedMinutes: 30 },
  extended: { cost: 90, includedMinutes: 60 },
};

export const OVERAGE_RATE_PER_MINUTE = 2;
export const LOW_BALANCE_WARNING_CREDITS = 4;
export const GRACE_PERIOD_MS = 2 * 60 * 1000;

// Cancellation policy (session_rules.md): >24h before starts_at = full refund,
// <24h before = half refund, never joined by ends_at (no-show) = no refund.
export const CANCELLATION_FULL_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CANCELLATION_PARTIAL_REFUND_PERCENT = 50;

export function isSlotType(value: unknown): value is SlotType {
  return value === 'standard' || value === 'extended';
}

export type SessionState = {
  sessionId: string;
  status: 'active' | 'grace' | 'ended';
  balance: number;
  includedMinutes: number;
  elapsedMinutes: number;
  overageMinutes: number;
  isLowBalance: boolean;
  graceSecondsRemaining: number | null;
};
