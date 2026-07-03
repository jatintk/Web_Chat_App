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
// This tiered policy applies to client-initiated cancellations only --
// expert-initiated cancellations are always a 100% refund (business-initiated,
// not the client's fault).
export const CANCELLATION_FULL_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CANCELLATION_PARTIAL_REFUND_PERCENT = 50;

// A client can only join a scheduled session starting this long before its
// starts_at (no upper bound -- a late client can still join).
export const JOIN_WINDOW_BEFORE_MS = 10 * 60 * 1000;

// A client can only reschedule a booking if it starts more than this far in
// the future. The assigned expert is exempt from this restriction.
export const RESCHEDULE_MIN_LEAD_TIME_MS = 3 * 24 * 60 * 60 * 1000;

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
