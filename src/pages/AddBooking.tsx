import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { EventTypeSelector } from '../components/EventTypeSelector';
import { Plus, Trash2, Calendar as CalendarIcon, MapPin, Clock, ArrowLeft, CheckCircle } from 'lucide-react';

interface EventFormItem {
  id: string;
  eventName: string;
  eventTypes: string[];
  eventDate: string;
  eventTime: string;
  reportingTime: string;
  location: string;
  notes: string;
}

export function AddBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client Details State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');

  // Events / Functions List (supports 1, 2, 3, or unlimited events with different dates, times, locations)
  const [events, setEvents] = useState<EventFormItem[]>([
    {
      id: 'event-1',
      eventName: '',
      eventTypes: ['Bridal Makeup'],
      eventDate: '',
      eventTime: '',
      reportingTime: '',
      location: '',
      notes: ''
    }
  ]);

  // Overall Package Payment State
  const [totalAmount, setTotalAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState('UPI');

  // Add another event / function to this client
  const handleAddEvent = () => {
    const newEventNumber = events.length + 1;
    const defaultType = newEventNumber === 2 ? ['Mehendi'] : newEventNumber === 3 ? ['Hairstyle'] : ['Reception'];

    const newEvent: EventFormItem = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventName: '',
      eventTypes: defaultType,
      eventDate: '',
      eventTime: '',
      reportingTime: '',
      location: '',
      notes: ''
    };
    setEvents([...events, newEvent]);
  };

  // Remove an event
  const handleRemoveEvent = (id: string) => {
    if (events.length <= 1) return;
    setEvents(events.filter(e => e.id !== id));
  };

  // Update a specific event field
  const updateEventField = (id: string, field: keyof EventFormItem, value: string | string[]) => {
    setEvents(events.map(ev => ev.id === id ? { ...ev, [field]: value } : ev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Validation
      if (!clientName.trim()) {
        throw new Error('Please enter client name');
      }
      if (!clientPhone.trim()) {
        throw new Error('Please enter client phone number');
      }

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev.eventDate) {
          throw new Error(`Please select an event date for Event #${i + 1}`);
        }
        if (!ev.eventTypes || ev.eventTypes.length === 0) {
          throw new Error(`Please select at least one event type for Event #${i + 1} (e.g. Mehendi, Hairstyle)`);
        }
      }

      // 2. Create or Find Client
      let clientId = null;
      const cleanPhone = clientPhone.trim();
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        await supabase
          .from('clients')
          .update({
            name: clientName.trim(),
            whatsapp: clientWhatsapp.trim() || null,
            instagram: clientInstagram.trim() || null
          })
          .eq('id', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: clientName.trim(),
            phone: cleanPhone,
            whatsapp: clientWhatsapp.trim() || null,
            instagram: clientInstagram.trim() || null
          })
          .select('id')
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 3. Create all bookings/events for this client
      const createdBookingIds: string[] = [];

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const eventTypeString = ev.eventTypes.join(', ');
        const eventTitle = ev.eventName.trim() || `${clientName.trim()}'s ${eventTypeString}`;

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            client_id: clientId,
            event_name: eventTitle,
            event_type: eventTypeString,
            event_date: ev.eventDate,
            event_time: ev.eventTime || null,
            reporting_time: ev.reportingTime || null,
            location: ev.location.trim() || null,
            notes: ev.notes.trim() || null,
            status: 'Confirmed'
          })
          .select('id')
          .single();

        if (bookingError) throw bookingError;
        createdBookingIds.push(booking.id);
      }

      // 4. Attach package payment to the primary (first) booking
      const total = Number(totalAmount) || 0;
      const advance = Number(advanceAmount) || 0;
      const remaining = Math.max(0, total - advance);

      const initialHistory = advance > 0 ? [
        {
          id: 'initial-' + Date.now(),
          amount: advance,
          date: new Date().toISOString(),
          method: advancePaymentMethod,
          note: `Initial Advance for ${events.length} event(s)`
        }
      ] : [];

      if (createdBookingIds.length > 0) {
        const primaryBookingId = createdBookingIds[0];
        const { error: paymentError } = await supabase.from('payments').insert({
          booking_id: primaryBookingId,
          total_amount: total,
          advance_amount: advance,
          remaining_amount: remaining,
          payment_status: remaining === 0 && total > 0 ? 'Paid' : advance > 0 ? 'Partial' : 'Pending',
          payment_method: initialHistory.length > 0 ? JSON.stringify(initialHistory) : null
        });

        if (paymentError) throw paymentError;
      }

      // Success! Navigate directly to the client's details page
      navigate(`/clients/${clientId}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong while creating booking');
    } finally {
      setLoading(false);
    }
  };

  const calculatedRemaining = Math.max(0, (Number(totalAmount) || 0) - (Number(advanceAmount) || 0));

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Client & Booking</h1>
          <p className="text-xs text-gray-500">Add client info, multiple events/locations, and package payment</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl mb-5 text-sm flex items-start gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Client Details */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Client Information</h2>
            <span className="text-[10px] font-bold text-rosegold-700 bg-rosegold-50 px-2 py-0.5 rounded-md">
              Step 1
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Sravani Rao"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 outline-none text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={clientWhatsapp}
                  onChange={e => setClientWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Instagram Handle (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm font-semibold">@</span>
                <input
                  type="text"
                  placeholder="sravani_makeovers"
                  value={clientInstagram}
                  onChange={e => setClientInstagram(e.target.value.replace('@', ''))}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 outline-none text-sm transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Events / Functions List (Multiple dates, locations, custom event types) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <CalendarIcon size={18} className="text-rosegold-600" />
                Events & Functions ({events.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add multiple events with different dates, times, and different locations!
              </p>
            </div>
          </div>

          {events.map((event, index) => (
            <div
              key={event.id}
              className="bg-white p-5 rounded-3xl shadow-sm border border-rosegold-100 relative transition-all"
            >
              {/* Event Card Header */}
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rosegold-500 text-white text-xs font-extrabold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    Event #{index + 1} {event.eventName ? `• ${event.eventName}` : ''}
                  </span>
                </div>

                {events.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEvent(event.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Remove this event"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Custom Multi-Select Event Types with Persistent Memory */}
                <EventTypeSelector
                  selectedTypes={event.eventTypes}
                  onChange={(types) => updateEventField(event.id, 'eventTypes', types)}
                  required
                />

                {/* Optional Custom Event Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Event Name / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Haldi Ceremony / Mehendi Night / Muhurtham"
                    value={event.eventName}
                    onChange={e => updateEventField(event.id, 'eventName', e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-xs"
                  />
                </div>

                {/* Date & Times */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <CalendarIcon size={12} className="text-rosegold-600" /> Event Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={event.eventDate}
                      onChange={e => updateEventField(event.id, 'eventDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-xs font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" /> Event Time
                    </label>
                    <input
                      type="time"
                      value={event.eventTime}
                      onChange={e => updateEventField(event.id, 'eventTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-rosegold-500" /> Reporting Time
                    </label>
                    <input
                      type="time"
                      value={event.reportingTime}
                      onChange={e => updateEventField(event.id, 'reportingTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Specific Location for this Event */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin size={12} className="text-rosegold-600" /> Location / Venue for Event #{index + 1}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Hotel Novotel, Banjara Hills, Hyderabad (different venue per event)"
                    value={event.location}
                    onChange={e => updateEventField(event.id, 'location', e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Event Button */}
          <button
            type="button"
            onClick={handleAddEvent}
            className="w-full py-3 bg-rosegold-50 hover:bg-rosegold-100 border-2 border-dashed border-rosegold-300 hover:border-rosegold-400 text-rosegold-700 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </section>

        {/* Section 3: Package Payment Details */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Total Package Payment</h2>
            <span className="text-[10px] font-bold text-rosegold-700 bg-rosegold-50 px-2 py-0.5 rounded-md">
              Payment
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Total Package Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="e.g. 25000"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Advance Paid Now (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base font-bold text-green-700"
                />
              </div>
            </div>

            {Number(advanceAmount) > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Advance Payment Method
                </label>
                <div className="flex gap-2">
                  {['UPI', 'Cash', 'Bank Transfer'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAdvancePaymentMethod(m)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        advancePaymentMethod === m
                          ? 'bg-rosegold-500 text-white border-rosegold-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {totalAmount && (
              <div className="bg-rosegold-50/60 border border-rosegold-100 p-3.5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Remaining Balance Due:</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Can be paid later in installments</p>
                </div>
                <span className="text-xl font-extrabold text-rosegold-700">
                  ₹{calculatedRemaining.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-rosegold-600 to-rosegold-500 hover:from-rosegold-700 hover:to-rosegold-600 text-white font-bold text-base py-4 rounded-2xl shadow-[0_8px_20px_rgb(183,110,121,0.3)] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving {events.length} Event(s)...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>Confirm & Save {events.length} Event(s) for Client</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
