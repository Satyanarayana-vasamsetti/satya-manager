import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Clock, MapPin, CalendarPlus } from 'lucide-react';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';

export function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, client:clients(*), services(*), payments(*)')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
        
      if (!error && data) {
        setBookings(data as Booking[]);
      }
      setLoading(false);
    }
    fetchBookings();
  }, []);

  const formatHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM do, yyyy');
  };

  // Group bookings by date
  const groupedBookings = bookings.reduce((acc, booking) => {
    if (!acc[booking.event_date]) acc[booking.event_date] = [];
    acc[booking.event_date].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Schedule</h1>
      
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading schedule...</div>
      ) : Object.keys(groupedBookings).length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No upcoming events. Time to relax!
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedBookings).map((dateStr) => (
            <div key={dateStr} className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-1 sticky top-0 bg-gray-50/90 backdrop-blur-sm py-2 z-10">
                {formatHeader(dateStr)}
              </h2>
              <div className="space-y-3">
                {groupedBookings[dateStr].map((booking) => (
                  <div key={booking.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-rosegold-500">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{booking.client?.name}</h3>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        {booking.status}
                      </span>
                    </div>
                    
                    <p className="text-rosegold-600 font-medium text-sm mb-3">{booking.event_type} {booking.event_name && `- ${booking.event_name}`}</p>
                    
                    <div className="flex flex-col gap-1.5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-gray-400" />
                        <span>Reporting: {booking.reporting_time ? format(parseISO(`1970-01-01T${booking.reporting_time}`), 'h:mm a') : 'TBD'}</span>
                        {booking.event_time && (
                          <span className="text-gray-400 text-xs ml-1">(Event: {format(parseISO(`1970-01-01T${booking.event_time}`), 'h:mm a')})</span>
                        )}
                      </div>
                      
                      {booking.location && (
                        <div className="flex items-start gap-2">
                          <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{booking.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {booking.services && booking.services.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {booking.services.map(s => (
                          <span key={s.id} className="text-[10px] bg-rosegold-50 text-rosegold-700 px-2 py-1 rounded-md font-medium">
                            {s.service_name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                      <a 
                        href={getGoogleCalendarUrl(booking)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-rosegold-600 bg-gray-50 hover:bg-rosegold-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CalendarPlus size={14} /> Add to Calendar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
