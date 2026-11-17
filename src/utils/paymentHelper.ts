import { supabase } from '../lib/supabase';
import type { Payment } from '../types';

export interface PaymentInstallment {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
}

/**
 * Parses the payment_method field which stores the JSON array of installments,
 * or gracefully constructs the initial installment if advance_amount > 0.
 */
export function parsePaymentHistory(payment?: Payment | null): PaymentInstallment[] {
  if (!payment) return [];

  const raw = payment.payment_method;
  if (raw && typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    } catch {
      // fallback if json parse fails
    }
  }

  // If no history array yet, but advance_amount > 0, create initial record from booking payment
  if (Number(payment.advance_amount) > 0) {
    return [{
      id: 'initial-' + payment.id,
      amount: Number(payment.advance_amount),
      date: payment.created_at || new Date().toISOString(),
      method: (raw && !raw.startsWith('[') ? raw : 'Advance'),
      note: 'Initial Booking Advance'
    }];
  }

  return [];
}

/**
 * Records a new payment installment, updates advance_amount, remaining_amount,
 * payment_status, and stores the full installment history in payment_method.
 */
export async function recordPaymentInstallment(
  payment: Payment,
  amountToAdd: number,
  method: string = 'Cash',
  note: string = '',
  customDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (amountToAdd <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    const currentHistory = parsePaymentHistory(payment);
    const newInstallment: PaymentInstallment = {
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      amount: amountToAdd,
      date: customDate || new Date().toISOString(),
      method: method || 'Cash',
      note: note.trim() || undefined
    };

    const updatedHistory = [...currentHistory, newInstallment];

    const newAdvance = Number(payment.advance_amount || 0) + amountToAdd;
    const newRemaining = Math.max(0, Number(payment.total_amount || 0) - newAdvance);
    const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial';

    const { error } = await supabase
      .from('payments')
      .update({
        advance_amount: newAdvance,
        remaining_amount: newRemaining,
        payment_status: newStatus,
        payment_method: JSON.stringify(updatedHistory)
      })
      .eq('id', payment.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record payment';
    return { success: false, error: message };
  }
}
