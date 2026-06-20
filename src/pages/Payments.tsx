import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, booking:bookings(event_name, event_date, client:clients(name))')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePaymentUpdate = async (id: string, currentAdvance: number, total: number, amountToAdd: string) => {
    const amount = Number(amountToAdd);
    if (!amount || amount <= 0) return;
    
    const newAdvance = currentAdvance + amount;
    const newRemaining = total - newAdvance;
    const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial';

    await supabase.from('payments').update({
      advance_amount: newAdvance,
      remaining_amount: newRemaining,
      payment_status: newStatus
    }).eq('id', id);

    fetchPayments();
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Payments</h1>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No payment records found.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{payment.booking?.client?.name}</h3>
                  <p className="text-sm text-gray-500">{payment.booking?.event_name} • {payment.booking?.event_date}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  payment.payment_status === 'Paid' ? 'bg-green-50 text-green-700' :
                  payment.payment_status === 'Partial' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {payment.payment_status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-500 font-medium uppercase">Total</p>
                  <p className="font-bold text-gray-800">₹{payment.total_amount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-500 font-medium uppercase">Paid</p>
                  <p className="font-bold text-green-600">₹{payment.advance_amount}</p>
                </div>
                <div className="bg-rosegold-50 p-2 rounded-xl">
                  <p className="text-[10px] text-rosegold-600 font-medium uppercase">Pending</p>
                  <p className="font-bold text-rosegold-700">₹{payment.remaining_amount}</p>
                </div>
              </div>

              {payment.remaining_amount > 0 && (
                <div className="mt-4 flex gap-2">
                  <input 
                    type="number" 
                    id={`pay-${payment.id}`}
                    placeholder="Amount to add" 
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-sm"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById(`pay-${payment.id}`) as HTMLInputElement;
                      handlePaymentUpdate(payment.id, payment.advance_amount, payment.total_amount, input.value);
                      input.value = '';
                    }}
                    className="bg-rosegold-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
