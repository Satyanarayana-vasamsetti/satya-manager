import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { 
  Clock, 
  MapPin, 
  CalendarPlus, 
  Phone, 
  MessageCircle, 
  ChevronRight, 
  Users, 
  FileText, 
  ExternalLink,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';

export function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('bookings')
        .select('*, client:clients(*), services(*), payments(*)')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (filter === 'upcoming') {
        query = query.gte('event_date', today);
      }
        
      const { data, error } = await query;
        
      if (!error && data) {
        setBookings(data as Booking[]);
      }
      setLoading(false);
    }
    fetchBookings();
  }, [filter]);

  const formatHeader = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'EEEE, MMM do, yyyy');
    } catch {
      return dateStr;
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

  // Group bookings by date
  const groupedBookings = bookings.reduce((acc, booking) => {
    if (!acc[booking.event_date]) acc[booking.event_date] = [];
    acc[booking.event_date].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <div className="p-4 pb-24">
      {/* Page Header with Filter Tabs */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule</h1>
          <p className="text-xs text-gray-500 font-medium">Calendar view of all bookings</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'upcoming'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading schedule...</div>
      ) : Object.keys(groupedBookings).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
          No {filter === 'upcoming' ? 'upcoming' : ''} events found.
        </div>
      ) : (
        <div className="space-y-7">
          {Object.keys(groupedBookings).map((dateStr) => (
            <div key={dateStr} className="space-y-3">
              <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm py-2 z-10 flex items-center justify-between pl-1">
                <h2 className="text-xs font-extrabold text-rosegold-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon size={14} /> {formatHeader(dateStr)}
                </h2>
                <span className="text-[11px] font-semibold text-gray-400">
                  {groupedBookings[dateStr].length} {groupedBookings[dateStr].length === 1 ? 'event' : 'events'}
                </span>
              </div>

              <div className="space-y-3.5">
                {groupedBookings[dateStr].map((booking) => {
                  const payment = booking.payments && booking.payments.length > 0 ? booking.payments[0] : null;
                  const remaining = payment ? Number(payment.remaining_amount) : 0;
                  const paymentStatus = payment ? payment.payment_status : 'Pending';

                  return (
                    <div 
                      key={booking.id} 
                      className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-rosegold-500 hover:border-rosegold-200 transition-all"
                    >
                      {/* Client Header - Clickable to Client Details */}
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/clients/${booking.client_id}`}
                          className="flex items-center gap-2 group flex-1 min-w-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-rosegold-50 text-rosegold-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-rosegold-100 transition-colors">
                            {booking.client?.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <h3 className="font-bold text-gray-900 group-hover:text-rosegold-600 text-base truncate transition-colors">
                                {booking.client?.name || 'Unknown Client'}
                              </h3>
                              <ChevronRight size={15} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                            {booking.client?.phone && (
                              <p className="text-[11px] text-gray-400 font-medium">{booking.client.phone}</p>
                            )}
                          </div>
                        </Link>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {booking.client?.phone && (
                            <a 
                              href={`tel:${booking.client.phone}`}
                              className="p-1.5 text-rosegold-700 bg-rosegold-50 hover:bg-rosegold-100 rounded-lg transition-colors"
                              title="Call Client"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {booking.client?.whatsapp && (
                            <a 
                              href={`https://wa.me/${booking.client.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              title="WhatsApp Client"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ml-1 ${
                            booking.status === 'Confirmed' ? 'bg-green-50 text-green-700' :
                            booking.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* Event Type & Name */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        {booking.event_type ? (
                          booking.event_type.split(',').map((t, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-bold px-2 py-0.5 rounded-lg bg-rosegold-50 text-rosegold-700 border border-rosegold-200"
                            >
                              {t.trim()}
                            </span>
                          ))
                        ) : null}
                        {booking.event_name && (
                          <span className="text-xs font-semibold text-gray-700">
                            • {booking.event_name}
                          </span>
                        )}
                      </div>
                      
                      {/* Times & Location */}
                      <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400 shrink-0" />
                          <span>
                            Reporting: <span className="font-semibold text-gray-900">{formatTime(booking.reporting_time) || booking.reporting_time || 'TBD'}</span>
                          </span>
                          {booking.event_time && (
                            <span className="text-gray-400 ml-1">
                              (Event: {formatTime(booking.event_time)})
                            </span>
                          )}
                        </div>
                        
                        {booking.location && (
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                            <span className="flex-1 text-gray-800 line-clamp-2">{booking.location}</span>
                            <a
                              href={booking.maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rosegold-600 hover:text-rosegold-700 font-semibold text-[11px] flex items-center gap-0.5 shrink-0"
                            >
                              Map <ExternalLink size={10} />
                            </a>
                          </div>
                        )}

                        {booking.number_of_people && booking.number_of_people > 0 && (
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-gray-400 shrink-0" />
                            <span>Guests/People: <span className="font-semibold text-gray-900">{booking.number_of_people}</span></span>
                          </div>
                        )}

                        {(booking.notes || booking.special_requirements) && (
                          <div className="mt-1 p-2 bg-gray-50 rounded-xl text-gray-700 space-y-1">
                            {booking.notes && (
                              <div className="flex items-start gap-1.5">
                                <FileText size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">Notes:</span> {booking.notes}</span>
                              </div>
                            )}
                            {booking.special_requirements && (
                              <div className="flex items-start gap-1.5 text-rosegold-800">
                                <FileText size={12} className="text-rosegold-400 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">Req:</span> {booking.special_requirements}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Services */}
                      {booking.services && booking.services.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {booking.services.map(s => (
                            <span key={s.id} className="text-[10px] bg-rosegold-50 text-rosegold-700 px-2.5 py-1 rounded-md font-semibold">
                              {s.service_name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Payment Summary & Action Buttons */}
                      <div className="mt-3.5 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <div className="text-xs">
                          {payment ? (
                            <span className="text-gray-600">
                              {paymentStatus === 'Paid' ? (
                                <span className="text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 size={13} /> Paid (₹{Number(payment.total_amount).toLocaleString('en-IN')})
                                </span>
                              ) : (
                                <span>
                                  Pending: <span className="font-bold text-rosegold-700">₹{remaining.toLocaleString('en-IN')}</span>
                                  <span className="text-gray-400 text-[10px] ml-1">(Total: ₹{Number(payment.total_amount).toLocaleString('en-IN')})</span>
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">No payment info</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/clients/${booking.client_id}`}
                            className="text-xs font-bold text-gray-700 hover:text-rosegold-600 bg-gray-100 hover:bg-rosegold-50 px-2.5 py-1.5 rounded-xl transition-colors"
                          >
                            Details
                          </Link>
                          <a 
                            href={getGoogleCalendarUrl(booking)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1.5 text-xs font-bold text-rosegold-700 hover:text-rosegold-800 bg-rosegold-50 hover:bg-rosegold-100 px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <CalendarPlus size={13} /> Add to Calendar
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
