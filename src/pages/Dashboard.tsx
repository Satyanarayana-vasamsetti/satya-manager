import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  CalendarPlus, 
  Phone, 
  ChevronRight, 
  CheckCircle2,
  User,
  Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';
import { NotificationModal } from '../components/NotificationModal';
import { 
  generateNotificationsFromBookings, 
  checkAndSendEventAlerts,
  getNotificationPermission,
  requestNotificationPermission 
} from '../utils/notificationHelper';
import { format, isToday, isTomorrow, parseISO, differenceInCalendarDays } from 'date-fns';

export function Dashboard() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all bookings ordered by event_date, then event_time
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, client:clients(*), services(*), payments(*)')
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        if (bookings) {
          setAllBookings(bookings as Booking[]);
        }

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

  useEffect(() => {
    if (allBookings.length > 0) {
      checkAndSendEventAlerts(allBookings);
    }
  }, [allBookings]);

  if (loading) return <div className="p-4 text-center mt-10 text-gray-500">Loading dashboard...</div>;

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = allBookings.filter((b) => b.event_date === today);
  const upcomingBookings = allBookings.filter((b) => b.event_date >= today);
  const displayedBookings = filter === 'upcoming' ? upcomingBookings : allBookings;
  const nextBooking = todayBookings.length > 0 ? todayBookings[0] : (upcomingBookings.length > 0 ? upcomingBookings[0] : null);

  const notifications = generateNotificationsFromBookings(allBookings);

  const formatEventDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, d MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const getRelativeDay = (dateStr: string) => {
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

  return (
    <div className="p-4 pb-24">
      {/* Brand Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Satya Makeovers</h1>
          <p className="text-xs text-gray-500 font-medium">Business Management</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="w-10 h-10 bg-white hover:bg-rosegold-50 rounded-2xl flex items-center justify-center text-gray-700 hover:text-rosegold-600 transition-colors shadow-xs border border-gray-100 relative active:scale-95"
            title="Notifications & Reminders"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rosegold-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                {notifications.length}
              </span>
            )}
          </button>
          <div className="w-10 h-10 bg-rosegold-100 rounded-2xl flex items-center justify-center text-rosegold-700 font-bold shadow-xs">
            S
          </div>
        </div>
      </div>

      {/* Optional Notification Activation Pill */}
      {getNotificationPermission() === 'default' && (
        <div className="mb-5 p-3 bg-white rounded-2xl border border-rosegold-200 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0">🔔</span>
            <p className="text-xs font-semibold text-gray-800 truncate">
              Get device reminders for appointments & payments
            </p>
          </div>
          <button
            onClick={async () => {
              await requestNotificationPermission();
            }}
            className="text-[11px] font-bold text-white bg-rosegold-500 hover:bg-rosegold-600 px-3 py-1.5 rounded-xl transition-colors shrink-0 shadow-xs"
          >
            Enable
          </button>
        </div>
      )}
      
      {/* Schedule Overview Widget */}
      <div className="bg-gradient-to-br from-rosegold-500 to-rosegold-600 rounded-3xl p-6 text-white shadow-[0_8px_30px_rgb(183,110,121,0.28)] mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
        <h2 className="text-sm font-medium opacity-90 flex items-center gap-2">
          <CalendarIcon size={16} /> Schedule Overview
        </h2>
        
        {todayBookings.length > 0 ? (
          <div className="mt-4">
            <p className="text-3xl font-extrabold">{todayBookings.length} {todayBookings.length === 1 ? 'Event' : 'Events'} Today</p>
            {nextBooking && (
              <div className="mt-4 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Today's Appointment</p>
                  <Link
                    to={`/clients/${nextBooking.client_id}`}
                    className="text-[11px] bg-white/30 hover:bg-white/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-colors"
                  >
                    <User size={11} /> Client Profile <ChevronRight size={11} />
                  </Link>
                </div>

                <Link
                  to={`/clients/${nextBooking.client_id}`}
                  className="block text-lg font-bold hover:underline"
                >
                  {nextBooking.client?.name} - {nextBooking.event_type}
                </Link>

                <div className="flex flex-col gap-1 mt-2 text-sm opacity-90 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> Reporting: {formatTime(nextBooking.reporting_time) || nextBooking.reporting_time || 'N/A'}
                    {nextBooking.event_time && ` • Event: ${formatTime(nextBooking.event_time)}`}
                  </span>
                  {nextBooking.location && (
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {nextBooking.location}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/clients/${nextBooking.client_id}`} className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-colors text-center">
                    Client Details
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
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-2xl font-bold">No events today</p>
            {nextBooking ? (
              <div className="mt-3 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Next Upcoming Appointment</p>
                  {getRelativeDay(nextBooking.event_date) && (
                    <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold">
                      {getRelativeDay(nextBooking.event_date)}
                    </span>
                  )}
                </div>

                <Link 
                  to={`/clients/${nextBooking.client_id}`}
                  className="block text-lg font-bold hover:underline"
                >
                  {nextBooking.client?.name} - {nextBooking.event_type}
                </Link>

                <div className="flex flex-col gap-1 mt-2 text-sm opacity-90 mb-3">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon size={14} /> Date: {formatEventDate(nextBooking.event_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> Reporting: {formatTime(nextBooking.reporting_time) || nextBooking.reporting_time || 'TBD'}
                    {nextBooking.event_time && ` • Event: ${formatTime(nextBooking.event_time)}`}
                  </span>
                  {nextBooking.location && (
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {nextBooking.location}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link 
                    to={`/clients/${nextBooking.client_id}`} 
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-sm font-medium transition-colors text-center"
                  >
                    Client Details
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
            ) : (
              <p className="text-sm opacity-90 mt-1">Take some rest or plan for upcoming events!</p>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/payments" className="bg-white p-5 rounded-3xl shadow-sm border border-rosegold-100 flex flex-col justify-center active:scale-98 transition-transform">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-900">₹{pendingPayments.toLocaleString('en-IN')}</p>
        </Link>
        <Link to="/leads" className="bg-white p-5 rounded-3xl shadow-sm border border-rosegold-100 flex flex-col justify-center active:scale-98 transition-transform">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">New Leads</p>
          <p className="text-2xl font-bold text-rosegold-600">{newLeads}</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 text-sm mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/add-booking" className="bg-rosegold-500 hover:bg-rosegold-600 text-white py-3 px-4 rounded-2xl font-medium text-center shadow-sm active:scale-98 transition-all">
            + Add Booking
          </Link>
          <Link to="/clients" className="bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-2xl font-medium text-center shadow-xs active:bg-gray-50 transition-colors">
            View Clients
          </Link>
        </div>
      </div>

      {/* Event List Ordered by Date */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rosegold-100 text-rosegold-700 rounded-xl">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">Event List</h3>
              <p className="text-xs text-gray-500">Click client name to view details</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'upcoming'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Upcoming ({upcomingBookings.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All ({allBookings.length})
            </button>
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
            No {filter === 'upcoming' ? 'upcoming' : ''} events found.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedBookings.map((booking) => {
              const relDay = getRelativeDay(booking.event_date);
              const isCurrentDay = booking.event_date === today;
              const hasPayment = booking.payments && booking.payments.length > 0;
              const remaining = hasPayment ? Number(booking.payments![0].remaining_amount) : 0;
              const paymentStatus = hasPayment ? booking.payments![0].payment_status : 'Pending';

              return (
                <div
                  key={booking.id}
                  className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${
                    isCurrentDay
                      ? 'border-rosegold-400 ring-2 ring-rosegold-100'
                      : 'border-gray-100 hover:border-rosegold-200'
                  }`}
                >
                  {/* Date & Status Bar */}
                  <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">
                        {formatEventDate(booking.event_date)}
                      </span>
                      {relDay && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCurrentDay
                              ? 'bg-rosegold-500 text-white'
                              : 'bg-rosegold-50 text-rosegold-700'
                          }`}
                        >
                          {relDay}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        booking.status === 'Confirmed'
                          ? 'bg-green-50 text-green-700'
                          : booking.status === 'Cancelled'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  {/* Client & Event Info - Clickable to Client Details */}
                  <div className="flex justify-between items-start">
                    <Link
                      to={`/clients/${booking.client_id}`}
                      className="group flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 group-hover:text-rosegold-600 text-base transition-colors truncate">
                          {booking.client?.name || 'Client'}
                        </h4>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {booking.event_type ? (
                          booking.event_type.split(',').map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rosegold-50 text-rosegold-700 border border-rosegold-200"
                            >
                              {t.trim()}
                            </span>
                          ))
                        ) : null}
                        {booking.event_name && (
                          <span className="text-[11px] font-medium text-gray-600 truncate">
                            • {booking.event_name}
                          </span>
                        )}
                      </div>
                    </Link>

                    {booking.client?.phone && (
                      <a
                        href={`tel:${booking.client.phone}`}
                        className="p-2 text-rosegold-700 bg-rosegold-50 hover:bg-rosegold-100 rounded-xl transition-colors flex items-center justify-center shrink-0 ml-2"
                        title="Call Client"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </div>

                  {/* Timing & Location */}
                  <div className="mt-3 flex flex-col gap-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-gray-400 shrink-0" />
                      <span>
                        Reporting: <span className="font-medium text-gray-800">{formatTime(booking.reporting_time) || booking.reporting_time || 'TBD'}</span>
                      </span>
                      {booking.event_time && (
                        <span className="text-gray-400">
                          (Event: {formatTime(booking.event_time)})
                        </span>
                      )}
                    </div>

                    {booking.location && (
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{booking.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Services tags */}
                  {booking.services && booking.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {booking.services.map((s) => (
                        <span
                          key={s.id}
                          className="text-[10px] bg-rosegold-50 text-rosegold-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {s.service_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Payment & Action Links */}
                  <div className="mt-3 pt-2.5 border-t border-gray-50 flex justify-between items-center">
                    <div className="text-[11px] text-gray-500">
                      {hasPayment ? (
                        <span className="flex items-center gap-1">
                          {paymentStatus === 'Paid' ? (
                            <span className="text-green-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 size={12} /> Paid
                            </span>
                          ) : (
                            <span>
                              Pending:{' '}
                              <span className="font-semibold text-gray-800">
                                ₹{remaining.toLocaleString('en-IN')}
                              </span>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">No payment info</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/clients/${booking.client_id}`}
                        className="text-xs font-bold text-gray-700 hover:text-rosegold-600 bg-gray-100 hover:bg-rosegold-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Client Details
                      </Link>
                      <a
                        href={getGoogleCalendarUrl(booking)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-rosegold-700 hover:text-rosegold-800 bg-rosegold-50 hover:bg-rosegold-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <CalendarPlus size={13} /> Add to Calendar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
      />
    </div>
  );
}
