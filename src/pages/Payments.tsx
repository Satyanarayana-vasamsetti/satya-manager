import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { History, ChevronDown, ChevronUp, Plus, ExternalLink } from 'lucide-react';
import { parsePaymentHistory, recordPaymentInstallment } from '../utils/paymentHelper';
import { format, parseISO } from 'date-fns';

export function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Installment input states per payment
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNote, setPayNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, booking:bookings(client_id, event_name, event_type, event_date, client:clients(name, phone))')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRecordPayment = async (payment: any) => {
    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    const result = await recordPaymentInstallment(
      payment,
      numAmount,
      payMethod,
      payNote,
      new Date().toISOString()
    );
    setIsSaving(false);

    if (result.success) {
      setPayAmount('');
      setPayNote('');
      setActivePaymentId(null);
      fetchPayments();
    } else {
      alert(result.error || 'Failed to record payment');
    }
  };

  const formatInstallmentDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM yyyy, h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments</h1>
          <p className="text-xs text-gray-500 font-medium">Track all advance amounts and payment history</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-8 h-8 border-3 border-rosegold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading payments...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
          No payment records found.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const installments = parsePaymentHistory(payment);
            const isExpanded = expandedHistoryId === payment.id;
            const isAdding = activePaymentId === payment.id;
            const client = payment.booking?.client;

            return (
              <div key={payment.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-rosegold-200 transition-all">
                {/* Header: Client & Status */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    {payment.booking?.client_id ? (
                      <Link
                        to={`/clients/${payment.booking.client_id}`}
                        className="font-bold text-gray-900 text-lg hover:text-rosegold-600 transition-colors inline-flex items-center gap-1 group"
                      >
                        <span>{client?.name || 'Client'}</span>
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-rosegold-600 transition-colors" />
                      </Link>
                    ) : (
                      <h3 className="font-bold text-gray-900 text-lg">{client?.name || 'Client'}</h3>
                    )}
                    <p className="text-xs text-rosegold-600 font-semibold mt-0.5">
                      {payment.booking?.event_type} {payment.booking?.event_name && `• ${payment.booking.event_name}`}
                      {payment.booking?.event_date && ` • ${payment.booking.event_date}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                    payment.payment_status === 'Paid' ? 'bg-green-50 text-green-700' :
                    payment.payment_status === 'Partial' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {payment.payment_status}
                  </span>
                </div>
                
                {/* 3-Col Financial Overview */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Total</p>
                    <p className="font-extrabold text-gray-800 text-sm mt-0.5">₹{Number(payment.total_amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Paid</p>
                    <p className="font-extrabold text-green-600 text-sm mt-0.5">₹{Number(payment.advance_amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-rosegold-50 p-2.5 rounded-xl">
                    <p className="text-[10px] text-rosegold-600 font-semibold uppercase">Balance</p>
                    <p className="font-extrabold text-rosegold-700 text-sm mt-0.5">₹{Number(payment.remaining_amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* History Accordion Header */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                  <button
                    onClick={() => setExpandedHistoryId(isExpanded ? null : payment.id)}
                    className="flex items-center gap-1.5 font-bold text-gray-700 hover:text-rosegold-700 transition-colors"
                  >
                    <History size={13} className="text-rosegold-600" />
                    <span>Payment History ({installments.length})</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {Number(payment.remaining_amount || 0) > 0 && !isAdding && (
                    <button
                      onClick={() => {
                        setActivePaymentId(payment.id);
                        setPayAmount('');
                        setPayNote('');
                      }}
                      className="bg-rosegold-600 hover:bg-rosegold-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors active:scale-95 text-[11px]"
                    >
                      <Plus size={12} /> Add Payment
                    </button>
                  )}
                </div>

                {/* Expanded Payment History Timeline */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    {installments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No payment history recorded.</p>
                    ) : (
                      installments.map((inst, idx) => (
                        <div
                          key={inst.id || idx}
                          className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900">
                                +₹{Number(inst.amount).toLocaleString('en-IN')}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                inst.method === 'UPI' ? 'bg-blue-50 text-blue-700' :
                                inst.method === 'Cash' ? 'bg-amber-50 text-amber-800' :
                                inst.method === 'Bank Transfer' ? 'bg-purple-50 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {inst.method}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                              {formatInstallmentDate(inst.date)} {inst.note && `• ${inst.note}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Add Payment Form */}
                {isAdding && (
                  <div className="mt-3 p-3.5 bg-gray-50 rounded-2xl border border-rosegold-200 animate-in fade-in duration-150">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-bold text-gray-800">Record Installment</span>
                      <button
                        onClick={() => setActivePaymentId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Amount (₹)</label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="e.g. 1000"
                          max={Number(payment.remaining_amount || 0)}
                          className="w-full bg-white px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-rosegold-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Method</label>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="w-full bg-white px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-rosegold-500"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI (GPay / PhonePe)</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Note / Info</label>
                      <input
                        type="text"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="e.g. Received via PhonePe"
                        className="w-full bg-white px-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rosegold-500"
                      />
                    </div>

                    <button
                      onClick={() => handleRecordPayment(payment)}
                      disabled={isSaving}
                      className="w-full bg-rosegold-600 hover:bg-rosegold-700 text-white text-xs font-bold py-2 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
