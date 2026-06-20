import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';
import { Calendar as CalendarIcon, MapPin, Clock, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';

export function Dashboard() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch today's bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, client:clients(*), services(*), payments(*)')
          .eq('event_date', today)
          .order('event_time', { ascending: true });

        if (bookings) setTodayBookings(bookings as Booking[]);

        // Fetch pending payments
        const { data: payments } = await supabase
          .from('payments')
          .select('remaining_amount')
          .gt('remaining_amount', 0);
        
        const totalPending = payments?.reduce((sum, p) => sum + Number(p.remaining_amount), 0) || 0;
        setPendingPayments(totalPending);

        // Fetch new leads
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'New Lead');
        
        setNewLeads(count || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="p-4 text-center mt-10 text-gray-500">Loading dashboard...</div>;

  const nextBooking = todayBookings.length > 0 ? todayBookings[0] : null;

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Satya Makeovers</h1>
        <div className="w-10 h-10 bg-rosegold-100 rounded-full flex items-center justify-center text-rosegold-700 font-bold">
          S
        </div>
      </div>
      
      {/* Today's Overview Widget */}
      <div className="bg-gradient-to-br from-rosegold-500 to-rosegold-600 rounded-3xl p-6 text-white shadow-[0_8px_30px_rgb(183,110,121,0.3)] mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <h2 className="text-sm font-medium opacity-90 flex items-center gap-2">
          <CalendarIcon size={16} /> Today's Schedule
        </h2>
        
        {nextBooking ? (
          <div className="mt-4">
            <p className="text-3xl font-bold">{todayBookings.length} {todayBookings.length === 1 ? 'Event' : 'Events'}</p>
            <div className="mt-4 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1">Next Appointment</p>
              <p className="text-lg font-bold">{nextBooking.client?.name} - {nextBooking.event_type}</p>
              <div className="flex flex-col gap-1 mt-2 text-sm opacity-90 mb-4">
                <span className="flex items-center gap-1"><Clock size={14} /> Reporting: {nextBooking.reporting_time || 'N/A'}</span>
                {nextBooking.location && <span className="flex items-center gap-1"><MapPin size={14} /> {nextBooking.location}</span>}
              </div>
              <div className="flex gap-2">
                <Link to="/calendar" className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-colors text-center">
                  View Full Schedule
                </Link>
                <a 
                  href={getGoogleCalendarUrl(nextBooking)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex-1 bg-white hover:bg-gray-50 text-rosegold-700 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <CalendarPlus size={16} /> Sync to Phone
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-2xl font-bold">No events today</p>
            <p className="text-sm opacity-90 mt-1">Take some rest or plan for tomorrow!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-rosegold-50 flex flex-col justify-center">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-900">₹{pendingPayments.toLocaleString('en-IN')}</p>
        </div>
        <Link to="/more" className="bg-white p-5 rounded-3xl shadow-sm border border-rosegold-50 flex flex-col justify-center active:scale-95 transition-transform">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">New Leads</p>
          <p className="text-2xl font-bold text-rosegold-600">{newLeads}</p>
        </Link>
      </div>

      <h3 className="font-semibold text-gray-800 mb-4 px-1">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/add-booking" className="bg-rosegold-50 text-rosegold-700 py-3 px-4 rounded-2xl font-medium text-center active:bg-rosegold-100 transition-colors">
          Add Booking
        </Link>
        <Link to="/clients" className="bg-gray-100 text-gray-700 py-3 px-4 rounded-2xl font-medium text-center active:bg-gray-200 transition-colors">
          View Clients
        </Link>
      </div>
    </div>
  );
}
