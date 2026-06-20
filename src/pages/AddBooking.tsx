import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Haldi', 'Mehendi Function', 'Baby Shower', 'Photoshoot', 'Party Makeup', 'Other'];
const AVAILABLE_SERVICES = ['Bridal Makeup', 'Reception Makeup', 'Mehendi', 'Hairstyle', 'Saree Draping', 'Nail Art', 'Guest Makeup', 'Flower Decoration', 'Other'];

export function AddBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [reportingTime, setReportingTime] = useState('');
  const [location, setLocation] = useState('');
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create or Find Client
      let clientId = null;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone)
        .limit(1)
        .maybeSingle();
      
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ name: clientName, phone: clientPhone, whatsapp: clientWhatsapp })
          .select('id')
          .single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 2. Create Booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientId,
          event_name: eventName || `${clientName}'s ${eventType}`,
          event_type: eventType,
          event_date: eventDate,
          event_time: eventTime || null,
          reporting_time: reportingTime || null,
          location,
          status: 'Confirmed'
        })
        .select('id')
        .single();
      if (bookingError) throw bookingError;

      // 3. Add Services
      if (selectedServices.length > 0) {
        const servicesData = selectedServices.map(s => ({
          booking_id: booking.id,
          service_name: s
        }));
        const { error: servicesError } = await supabase.from('services').insert(servicesData);
        if (servicesError) throw servicesError;
      }

      // 4. Add Payment
      const total = Number(totalAmount) || 0;
      const advance = Number(advanceAmount) || 0;
      const remaining = total - advance;
      
      const { error: paymentError } = await supabase.from('payments').insert({
        booking_id: booking.id,
        total_amount: total,
        advance_amount: advance,
        remaining_amount: remaining,
        payment_status: remaining === 0 ? 'Paid' : advance > 0 ? 'Partial' : 'Pending'
      });
      if (paymentError) throw paymentError;

      // Success! Navigate back
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Booking</h1>
      
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Details */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Client Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input required type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="tel" value={clientWhatsapp} onChange={e => setClientWhatsapp(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
          </div>
        </section>

        {/* Event Details */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Event Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none bg-white">
                {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name (Optional)</label>
              <input type="text" placeholder="e.g. Aditi's Grand Wedding" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input required type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
                <input type="time" value={reportingTime} onChange={e => setReportingTime(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <textarea value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" rows={2}></textarea>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Services Needed</h2>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_SERVICES.map(service => (
              <label key={service} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${selectedServices.includes(service) ? 'border-rosegold-500 bg-rosegold-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedServices.includes(service)}
                  onChange={() => toggleService(service)}
                  className="w-4 h-4 text-rosegold-600 focus:ring-rosegold-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{service}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Payment */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹) *</label>
              <input required type="number" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-lg font-bold" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Paid (₹)</label>
              <input type="number" min="0" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
            </div>
            {totalAmount && (
              <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Remaining Balance:</span>
                <span className="text-lg font-bold text-rosegold-600">₹{(Number(totalAmount) - Number(advanceAmount)).toLocaleString()}</span>
              </div>
            )}
          </div>
        </section>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-rosegold-600 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_8px_20px_rgb(183,110,121,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? 'Creating Booking...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}
