import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Client, Booking } from '../types';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  CalendarPlus, 
  Users, 
  FileText, 
  Trash2, 
  CreditCard, 
  PlusCircle, 
  ExternalLink,
  History,
  Plus
} from 'lucide-react';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';
import { parsePaymentHistory, recordPaymentInstallment } from '../utils/paymentHelper';
import { format, parseISO, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment form state
  const [activePaymentBookingId, setActivePaymentBookingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const fetchClientData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error: clientError } = await supabase
        .from('clients')
        .select('*, bookings(*, services(*), payments(*))')
        .eq('id', id)
        .single();

      if (clientError) {
        setError(clientError.message || 'Client not found');
      } else if (data) {
        if (data.bookings) {
          data.bookings.sort((a: Booking, b: Booking) => 
            (a.event_date || '').localeCompare(b.event_date || '')
          );
        }
        setClient(data as Client);
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteClient = async () => {
    if (!client) return;
    if (window.confirm(`Are you sure you want to delete ${client.name}? This will permanently remove all bookings and payment records for this client.`)) {
      await supabase.from('clients').delete().eq('id', client.id);
      navigate('/clients');
    }
  };

  const handleDeleteBooking = async (bookingId: string, eventName: string) => {
    if (window.confirm(`Are you sure you want to delete the booking "${eventName}"?`)) {
      await supabase.from('bookings').delete().eq('id', bookingId);
      fetchClientData();
    }
  };

  const handleRecordPayment = async (booking: Booking) => {
    const payment = booking.payments && booking.payments.length > 0 ? booking.payments[0] : null;
    if (!payment) return;

    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setIsSavingPayment(true);
    const dateObj = new Date(payDate);
    const dateWithTime = new Date();
    dateWithTime.setFullYear(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    const result = await recordPaymentInstallment(
      payment,
      numAmount,
      payMethod,
      payNote,
      dateWithTime.toISOString()
    );

    setIsSavingPayment(false);

    if (result.success) {
      setPayAmount('');
      setPayNote('');
      setActivePaymentBookingId(null);
      fetchClientData();
    } else {
      alert(result.error || 'Failed to save payment');
    }
  };

  const formatEventDate = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    try {
      return format(parseISO(dateStr), 'EEEE, d MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const getRelativeDay = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return 'Today';
      if (isTomorrow(d)) return 'Tomorrow';
      const diff = differenceInCalendarDays(d, new Date());
      if (diff > 1) return `In ${diff} days`;
      if (diff === -1) return 'Yesterday';
      if (diff < -1) return `${Math.abs(diff)} days ago`;
      return null;
    } catch {
      return null;
    }
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    try {
      return format(parseISO(`1970-01-01T${timeStr}`), 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  const formatInstallmentDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM yyyy, h:mm a');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center py-28 text-gray-500">
        <div className="w-8 h-8 border-3 border-rosegold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-gray-600">Loading client details...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 text-center my-12">
        <p className="text-gray-700 font-medium mb-4">{error || 'Client not found'}</p>
        <Link to="/clients" className="bg-rosegold-500 hover:bg-rosegold-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
          Back to Clients
        </Link>
      </div>
    );
  }

  // Calculate totals
  const bookings = client.bookings || [];
  let totalBilled = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  bookings.forEach((b) => {
    if (b.payments && b.payments.length > 0) {
      b.payments.forEach((p) => {
        totalBilled += Number(p.total_amount || 0);
        totalPaid += Number(p.advance_amount || 0);
        totalRemaining += Number(p.remaining_amount || 0);
      });
    }
  });

  const clientInitial = (client.name?.trim() || 'C').charAt(0).toUpperCase();

  return (
    <div className="p-4 pb-28">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
          title="Go Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Client Profile</h1>
        <button
          onClick={handleDeleteClient}
          className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          title="Delete Client"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Client Identity Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-rosegold-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-rosegold-400 to-rosegold-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
            {clientInitial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{client.name}</h2>
            {client.phone && (
              <p className="text-sm font-medium text-gray-600 mt-0.5">{client.phone}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Added: {client.created_at ? format(parseISO(client.created_at), 'd MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 mt-5 pt-4 border-t border-gray-100">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rosegold-50 hover:bg-rosegold-100 text-rosegold-700 font-semibold rounded-xl text-sm transition-colors"
            >
              <Phone size={16} /> Call
            </a>
          )}
          {client.whatsapp && (
            <a
              href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl text-sm transition-colors"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          {client.instagram && (
            <a
              href={`https://instagram.com/${client.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold rounded-xl text-sm transition-colors"
              title="Instagram"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2.5 px-1 flex items-center gap-1.5">
          <CreditCard size={15} className="text-rosegold-600" /> Payment Summary
        </h3>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Billed</p>
            <p className="font-extrabold text-gray-900 text-base mt-0.5">₹{totalBilled.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Paid</p>
            <p className="font-extrabold text-green-600 text-base mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-rosegold-50 p-3.5 rounded-2xl shadow-xs border border-rosegold-100">
            <p className="text-[10px] text-rosegold-700 font-semibold uppercase tracking-wider">Balance Due</p>
            <p className="font-extrabold text-rosegold-700 text-base mt-0.5">₹{totalRemaining.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Bookings / Events Section */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon size={15} className="text-rosegold-600" /> Bookings & Events ({bookings.length})
          </h3>
          <Link
            to="/add-booking"
            className="text-xs font-bold text-rosegold-600 hover:text-rosegold-700 flex items-center gap-1"
          >
            <PlusCircle size={14} /> Add Booking
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
            No bookings recorded for this client yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const relDay = getRelativeDay(booking.event_date);
              const isEventToday = booking.event_date ? isToday(parseISO(booking.event_date)) : false;
              const payment = booking.payments && booking.payments.length > 0 ? booking.payments[0] : null;
              const installments = parsePaymentHistory(payment);
              const isAddingPayment = activePaymentBookingId === booking.id;

              return (
                <div 
                  key={booking.id}
                  className={`bg-white p-5 rounded-3xl shadow-sm border transition-all ${
                    isEventToday 
                      ? 'border-rosegold-400 ring-2 ring-rosegold-100' 
                      : 'border-gray-100'
                  }`}
                >
                  {/* Event Header with Date & Status */}
                  <div className="flex justify-between items-start pb-3 mb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-gray-900">
                          {formatEventDate(booking.event_date)}
                        </span>
                        {relDay && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isEventToday ? 'bg-rosegold-500 text-white' : 'bg-rosegold-50 text-rosegold-700'
                          }`}>
                            {relDay}
                          </span>
                        )}
                      </div>
                      <p className="text-rosegold-600 font-bold text-sm mt-1">
                        {booking.event_type} {booking.event_name ? `• ${booking.event_name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                        booking.status === 'Confirmed' ? 'bg-green-50 text-green-700' :
                        booking.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                      <button
                        onClick={() => handleDeleteBooking(booking.id, booking.event_name || booking.event_type)}
                        className="p-1 text-gray-300 hover:text-red-500 rounded-lg transition-colors ml-1"
                        title="Delete booking"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="space-y-2 text-xs text-gray-600">
                    {/* Time */}
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400 shrink-0" />
                      <span>
                        Reporting Time: <span className="font-semibold text-gray-900">{formatTime(booking.reporting_time) || booking.reporting_time || 'TBD'}</span>
                      </span>
                      {booking.event_time && (
                        <span className="text-gray-400 ml-1">
                          (Event: {formatTime(booking.event_time)})
                        </span>
                      )}
                    </div>

                    {/* Location & Map Link */}
                    {booking.location && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                        <span className="flex-1 text-gray-800">{booking.location}</span>
                        <a
                          href={booking.maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-rosegold-600 hover:text-rosegold-700 flex items-center gap-0.5 font-semibold text-[11px] shrink-0"
                        >
                          Map <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {/* Number of People */}
                    {booking.number_of_people && booking.number_of_people > 0 && (
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400 shrink-0" />
                        <span>Guests/People: <span className="font-semibold text-gray-900">{booking.number_of_people}</span></span>
                      </div>
                    )}

                    {/* Notes & Requirements */}
                    {(booking.notes || booking.special_requirements) && (
                      <div className="mt-2 p-2.5 bg-gray-50 rounded-xl text-gray-700 space-y-1">
                        {booking.notes && (
                          <div className="flex items-start gap-1.5">
                            <FileText size={13} className="text-gray-400 shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Notes:</span> {booking.notes}</span>
                          </div>
                        )}
                        {booking.special_requirements && (
                          <div className="flex items-start gap-1.5 text-rosegold-800">
                            <FileText size={13} className="text-rosegold-400 shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Requirements:</span> {booking.special_requirements}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Services Tags */}
                  {booking.services && booking.services.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {booking.services.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] bg-rosegold-50 text-rosegold-700 px-2.5 py-1 rounded-lg font-medium"
                          >
                            {s.service_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Details with Advance Amount History */}
                  {payment && (
                    <div className="mt-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                      {/* Payment Header */}
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                          <CreditCard size={14} className="text-rosegold-600" /> Payment & History
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          payment.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                          payment.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {payment.payment_status}
                        </span>
                      </div>
                      
                      {/* Financial 3-Col Box */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-2.5 rounded-xl border border-gray-100 mb-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Total</p>
                          <p className="font-extrabold text-gray-800 text-sm mt-0.5">₹{Number(payment.total_amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Paid</p>
                          <p className="font-extrabold text-green-600 text-sm mt-0.5">₹{Number(payment.advance_amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Balance</p>
                          <p className="font-extrabold text-rosegold-700 text-sm mt-0.5">₹{Number(payment.remaining_amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      {/* Payment History Timeline */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                            <History size={13} className="text-rosegold-600" /> Payment History ({installments.length})
                          </span>
                          {Number(payment.remaining_amount || 0) > 0 && !isAddingPayment && (
                            <button
                              onClick={() => {
                                setActivePaymentBookingId(booking.id);
                                setPayAmount('');
                                setPayNote('');
                              }}
                              className="text-[11px] font-bold text-rosegold-700 hover:text-rosegold-800 flex items-center gap-0.5 bg-rosegold-100 hover:bg-rosegold-200 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              <Plus size={12} /> Add Payment
                            </button>
                          )}
                        </div>

                        {installments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-1">No payment installments recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {installments.map((inst, index) => (
                              <div
                                key={inst.id || index}
                                className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
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
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Payment Form */}
                      {isAddingPayment && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-rosegold-200 animate-in fade-in duration-150">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-800">Record New Payment</span>
                            <button
                              onClick={() => setActivePaymentBookingId(null)}
                              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Amount (₹)</label>
                                <input
                                  type="number"
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  placeholder="e.g. 1000"
                                  className="w-full bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rosegold-500 font-bold"
                                  max={Number(payment.remaining_amount || 0)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Method</label>
                                <select
                                  value={payMethod}
                                  onChange={(e) => setPayMethod(e.target.value)}
                                  className="w-full bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rosegold-500 font-medium"
                                >
                                  <option value="Cash">Cash</option>
                                  <option value="UPI">UPI (GPay / PhonePe)</option>
                                  <option value="Bank Transfer">Bank Transfer</option>
                                  <option value="Card">Card</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Date</label>
                                <input
                                  type="date"
                                  value={payDate}
                                  onChange={(e) => setPayDate(e.target.value)}
                                  className="w-full bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rosegold-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase">Note / Info</label>
                                <input
                                  type="text"
                                  value={payNote}
                                  onChange={(e) => setPayNote(e.target.value)}
                                  placeholder="e.g. 2nd advance, PhonePe"
                                  className="w-full bg-gray-50 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-rosegold-500"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleRecordPayment(booking)}
                                disabled={isSavingPayment}
                                className="flex-1 bg-rosegold-600 hover:bg-rosegold-700 text-white text-xs font-bold py-2 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
                              >
                                {isSavingPayment ? 'Saving...' : 'Save Payment'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-end">
                    <a
                      href={getGoogleCalendarUrl({ ...booking, client })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-rosegold-700 hover:text-rosegold-800 bg-rosegold-50 hover:bg-rosegold-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <CalendarPlus size={14} /> Add to Google Calendar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
