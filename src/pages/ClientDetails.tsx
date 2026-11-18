import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  User,
  FileText, 
  Trash2, 
  CreditCard, 
  PlusCircle, 
  ExternalLink,
  History,
  Plus,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { getGoogleCalendarUrl } from '../utils/calendarHelper';
import { parsePaymentHistory, recordPaymentInstallment } from '../utils/paymentHelper';
import { EventTypeSelector } from '../components/EventTypeSelector';
import { format, parseISO, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';

interface EditEventItem {
  id: string;
  isNew?: boolean;
  eventName: string;
  eventTypes: string[];
  eventDate: string;
  eventTime: string;
  reportingTime: string;
  location: string;
  numberOfPeople: string;
  status: string;
  notes: string;
}

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================
  // PERFECT TABBED EDIT CLIENT MODAL STATE
  // ==========================================================
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'profile' | 'billing' | 'events'>('profile');
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientWhatsapp, setEditClientWhatsapp] = useState('');
  const [editClientInstagram, setEditClientInstagram] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editAdvanceAmount, setEditAdvanceAmount] = useState('');
  const [editEvents, setEditEvents] = useState<EditEventItem[]>([]);
  const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);
  const [isSavingClient, setIsSavingClient] = useState(false);

  // ==========================================================
  // ADD EVENT MODAL STATE
  // ==========================================================
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEventTypes, setNewEventTypes] = useState<string[]>(['Bridal Makeup']);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newReportingTime, setNewReportingTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newNumberOfPeople, setNewNumberOfPeople] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newEventAmount, setNewEventAmount] = useState('');
  const [isSavingNewEvent, setIsSavingNewEvent] = useState(false);

  // ==========================================================
  // INDIVIDUAL EDIT EVENT MODAL STATE
  // ==========================================================
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editBookingTypes, setEditBookingTypes] = useState<string[]>([]);
  const [editBookingName, setEditBookingName] = useState('');
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [editBookingReportingTime, setEditBookingReportingTime] = useState('');
  const [editBookingLocation, setEditBookingLocation] = useState('');
  const [editBookingNumberOfPeople, setEditBookingNumberOfPeople] = useState('');
  const [editBookingStatus, setEditBookingStatus] = useState('Confirmed');
  const [editBookingNotes, setEditBookingNotes] = useState('');
  const [isSavingEditEvent, setIsSavingEditEvent] = useState(false);

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

  // If page was loaded with ?edit=true, automatically open the comprehensive edit modal
  useEffect(() => {
    if (client && searchParams.get('edit') === 'true') {
      openEditClientModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Open Comprehensive Edit Client Modal
  const openEditClientModal = () => {
    if (!client) return;

    setEditClientName(client.name || '');
    setEditClientPhone(client.phone || '');
    setEditClientWhatsapp(client.whatsapp || '');
    setEditClientInstagram(client.instagram || '');

    let currentBilled = 0;
    let currentPaid = 0;
    (client.bookings || []).forEach(b => {
      (b.payments || []).forEach(p => {
        currentBilled += Number(p.total_amount || 0);
        currentPaid += Number(p.advance_amount || 0);
      });
    });
    setEditTotalAmount(currentBilled > 0 ? String(currentBilled) : '');
    setEditAdvanceAmount(currentPaid > 0 ? String(currentPaid) : '');

    const evs: EditEventItem[] = (client.bookings || []).map(b => ({
      id: b.id,
      isNew: false,
      eventName: b.event_name || '',
      eventTypes: (b.event_type || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      eventDate: b.event_date || '',
      eventTime: b.event_time || '',
      reportingTime: b.reporting_time || '',
      location: b.location || '',
      numberOfPeople: b.number_of_people ? String(b.number_of_people) : '',
      status: b.status || 'Confirmed',
      notes: b.notes || ''
    }));

    setEditEvents(evs);
    setDeletedEventIds([]);
    setEditModalTab('profile');
    setIsEditClientModalOpen(true);
  };

  const handleAddEventInEditModal = () => {
    const newId = `new-${Date.now()}`;
    const newEv: EditEventItem = {
      id: newId,
      isNew: true,
      eventName: '',
      eventTypes: ['Mehendi'],
      eventDate: '',
      eventTime: '',
      reportingTime: '',
      location: '',
      numberOfPeople: '',
      status: 'Confirmed',
      notes: ''
    };
    setEditEvents([...editEvents, newEv]);
  };

  const handleRemoveEventInEditModal = (idToRemove: string) => {
    const ev = editEvents.find(e => e.id === idToRemove);
    if (ev && !ev.isNew) {
      setDeletedEventIds(prev => [...prev, idToRemove]);
    }
    setEditEvents(editEvents.filter(e => e.id !== idToRemove));
  };

  const updateEditEventField = (eventId: string, field: keyof EditEventItem, value: any) => {
    setEditEvents(editEvents.map(ev => ev.id === eventId ? { ...ev, [field]: value } : ev));
  };

  // SAVE ALL CLIENT DATA (Client profile, all events, and package financials)
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    if (!editClientName.trim()) {
      alert('Client name is required');
      setEditModalTab('profile');
      return;
    }
    if (!editClientPhone.trim()) {
      alert('Client phone number is required');
      setEditModalTab('profile');
      return;
    }

    for (let i = 0; i < editEvents.length; i++) {
      const ev = editEvents[i];
      if (!ev.eventDate) {
        alert(`Please select an event date for Event #${i + 1}`);
        setEditModalTab('events');
        return;
      }
      if (!ev.eventTypes || ev.eventTypes.length === 0) {
        alert(`Please select or add at least one event type for Event #${i + 1}`);
        setEditModalTab('events');
        return;
      }
    }

    setIsSavingClient(true);

    try {
      // 1. Update Client in `clients` table
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: editClientName.trim(),
          phone: editClientPhone.trim(),
          whatsapp: editClientWhatsapp.trim() || null,
          instagram: editClientInstagram.trim().replace('@', '') || null
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

      // 2. Delete removed events if any
      for (const delId of deletedEventIds) {
        await supabase.from('bookings').delete().eq('id', delId);
      }

      // 3. Update existing events & insert newly added events
      let primaryBookingId: string | null = null;

      for (const ev of editEvents) {
        const eventTypeStr = ev.eventTypes.join(', ');
        const eventTitle = ev.eventName.trim() || `${editClientName.trim()}'s ${eventTypeStr}`;

        if (ev.isNew) {
          const { data: newB, error: newBErr } = await supabase
            .from('bookings')
            .insert({
              client_id: client.id,
              event_name: eventTitle,
              event_type: eventTypeStr,
              event_date: ev.eventDate,
              event_time: ev.eventTime || null,
              reporting_time: ev.reportingTime || null,
              location: ev.location.trim() || null,
              status: ev.status || 'Confirmed',
              notes: ev.notes.trim() || null,
              number_of_people: Number(ev.numberOfPeople) || 0
            })
            .select('id')
            .single();

          if (newBErr) throw newBErr;
          if (!primaryBookingId && newB) primaryBookingId = newB.id;
        } else {
          const { error: updateBErr } = await supabase
            .from('bookings')
            .update({
              event_name: eventTitle,
              event_type: eventTypeStr,
              event_date: ev.eventDate,
              event_time: ev.eventTime || null,
              reporting_time: ev.reportingTime || null,
              location: ev.location.trim() || null,
              status: ev.status || 'Confirmed',
              notes: ev.notes.trim() || null,
              number_of_people: Number(ev.numberOfPeople) || 0
            })
            .eq('id', ev.id);

          if (updateBErr) throw updateBErr;
          if (!primaryBookingId) primaryBookingId = ev.id;
        }
      }

      // 4. Update / Insert Financials in `payments` table
      const total = Number(editTotalAmount) || 0;
      const advance = Number(editAdvanceAmount) || 0;
      const remaining = Math.max(0, total - advance);
      const paymentStatus = remaining === 0 && total > 0 ? 'Paid' : advance > 0 ? 'Partial' : 'Pending';

      const existingPayment = (client.bookings || []).find(b => b.payments && b.payments.length > 0)?.payments?.[0];

      if (existingPayment) {
        const { error: payErr } = await supabase
          .from('payments')
          .update({
            total_amount: total,
            advance_amount: advance,
            remaining_amount: remaining,
            payment_status: paymentStatus
          })
          .eq('id', existingPayment.id);

        if (payErr) console.error('Payment update error:', payErr);
      } else if (total > 0 && primaryBookingId) {
        await supabase.from('payments').insert({
          booking_id: primaryBookingId,
          total_amount: total,
          advance_amount: advance,
          remaining_amount: remaining,
          payment_status: paymentStatus
        });
      }

      setIsEditClientModalOpen(false);
      await fetchClientData();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save client details');
    } finally {
      setIsSavingClient(false);
    }
  };

  // Open Add Event Modal
  const openAddEventModal = () => {
    setNewEventTypes(['Bridal Makeup']);
    setNewEventName('');
    setNewEventDate('');
    setNewEventTime('');
    setNewReportingTime('');
    setNewLocation('');
    setNewNumberOfPeople('');
    setNewNotes('');
    setNewEventAmount('');
    setIsAddEventModalOpen(true);
  };

  // Save New Event to this Client
  const handleSaveNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (!newEventDate) {
      alert('Please select an event date');
      return;
    }
    if (newEventTypes.length === 0) {
      alert('Please select or add at least one event type (e.g. Mehendi, Hairstyle)');
      return;
    }

    setIsSavingNewEvent(true);
    const eventTypeStr = newEventTypes.join(', ');
    const eventTitle = newEventName.trim() || `${client.name}'s ${eventTypeStr}`;

    const { data: newBooking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        client_id: client.id,
        event_name: eventTitle,
        event_type: eventTypeStr,
        event_date: newEventDate,
        event_time: newEventTime || null,
        reporting_time: newReportingTime || null,
        location: newLocation.trim() || null,
        number_of_people: Number(newNumberOfPeople) || 0,
        notes: newNotes.trim() || null,
        status: 'Confirmed'
      })
      .select('id')
      .single();

    if (bookingErr) {
      alert('Failed to add event: ' + bookingErr.message);
      setIsSavingNewEvent(false);
      return;
    }

    const amountNum = Number(newEventAmount);
    if (amountNum > 0 && newBooking) {
      await supabase.from('payments').insert({
        booking_id: newBooking.id,
        total_amount: amountNum,
        advance_amount: 0,
        remaining_amount: amountNum,
        payment_status: 'Pending',
        payment_method: null
      });
    }

    setIsSavingNewEvent(false);
    setIsAddEventModalOpen(false);
    fetchClientData();
  };

  // Open Individual Edit Event Modal
  const openEditBookingModal = (booking: Booking) => {
    setEditingBooking(booking);
    const types = (booking.event_type || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    setEditBookingTypes(types.length > 0 ? types : ['Bridal Makeup']);
    setEditBookingName(booking.event_name || '');
    setEditBookingDate(booking.event_date || '');
    setEditBookingTime(booking.event_time || '');
    setEditBookingReportingTime(booking.reporting_time || '');
    setEditBookingLocation(booking.location || '');
    setEditBookingNumberOfPeople(booking.number_of_people ? String(booking.number_of_people) : '');
    setEditBookingStatus(booking.status || 'Confirmed');
    setEditBookingNotes(booking.notes || '');
  };

  // Save Individual Edited Event
  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    if (!editBookingDate) {
      alert('Please select an event date');
      return;
    }
    if (editBookingTypes.length === 0) {
      alert('Please select or add at least one event type');
      return;
    }

    setIsSavingEditEvent(true);
    const eventTypeStr = editBookingTypes.join(', ');
    const eventTitle = editBookingName.trim() || `${client?.name || ''}'s ${eventTypeStr}`;

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        event_name: eventTitle,
        event_type: eventTypeStr,
        event_date: editBookingDate,
        event_time: editBookingTime || null,
        reporting_time: editBookingReportingTime || null,
        location: editBookingLocation.trim() || null,
        number_of_people: Number(editBookingNumberOfPeople) || 0,
        status: editBookingStatus,
        notes: editBookingNotes.trim() || null
      })
      .eq('id', editingBooking.id);

    setIsSavingEditEvent(false);

    if (updateErr) {
      alert('Failed to update event: ' + updateErr.message);
    } else {
      setEditingBooking(null);
      fetchClientData();
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    if (window.confirm(`Are you sure you want to delete ${client.name}? This will permanently remove all bookings and payment records for this client.`)) {
      await supabase.from('clients').delete().eq('id', client.id);
      navigate('/clients');
    }
  };

  const handleDeleteBooking = async (bookingId: string, eventName: string) => {
    if (window.confirm(`Are you sure you want to delete the event "${eventName}"?`)) {
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

  // Calculate totals across all bookings of this client
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

  const editModalRemaining = Math.max(0, (Number(editTotalAmount) || 0) - (Number(editAdvanceAmount) || 0));

  return (
    <div className="p-4 pb-28 max-w-2xl mx-auto">
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
        <div className="flex items-center gap-1">
          <button
            onClick={openEditClientModal}
            className="p-2 text-gray-600 hover:text-rosegold-600 rounded-xl hover:bg-rosegold-50 transition-colors"
            title="Edit Complete Details"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={handleDeleteClient}
            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            title="Delete Client"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Client Identity Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-rosegold-100 mb-6 relative">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-rosegold-400 to-rosegold-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
            {clientInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 truncate">{client.name}</h2>
              <button
                onClick={openEditClientModal}
                className="text-xs font-bold text-rosegold-600 hover:text-rosegold-700 bg-rosegold-50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit2 size={12} /> Edit
              </button>
            </div>
            {client.phone && (
              <p className="text-sm font-medium text-gray-600 mt-0.5">{client.phone}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Added: {client.created_at ? format(parseISO(client.created_at), 'd MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action buttons (Call, WhatsApp, Instagram) */}
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
              title={`@${client.instagram}`}
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
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={15} className="text-rosegold-600" /> Payment Summary
          </h3>
          <button
            onClick={() => {
              openEditClientModal();
              setEditModalTab('billing');
            }}
            className="text-[11px] font-bold text-rosegold-600 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <Edit2 size={11} /> Edit Price
          </button>
        </div>
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
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon size={15} className="text-rosegold-600" /> Events & Functions ({bookings.length})
            </h3>
            <p className="text-[11px] text-gray-500">Different dates, times, venues & event types</p>
          </div>
          <button
            onClick={openAddEventModal}
            className="text-xs font-bold text-white bg-rosegold-500 hover:bg-rosegold-600 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> Add Event
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
            <p className="mb-2">No events recorded for this client yet.</p>
            <button
              onClick={openAddEventModal}
              className="text-xs font-bold text-rosegold-600 hover:underline cursor-pointer"
            >
              + Add First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, index) => {
              const relDay = getRelativeDay(booking.event_date);
              const isEventToday = booking.event_date ? isToday(parseISO(booking.event_date)) : false;
              const payment = booking.payments && booking.payments.length > 0 ? booking.payments[0] : null;
              const installments = parsePaymentHistory(payment);
              const isAddingPayment = activePaymentBookingId === booking.id;

              const eventTypesList = (booking.event_type || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

              return (
                <div 
                  key={booking.id}
                  className={`bg-white p-5 rounded-3xl shadow-sm border transition-all ${
                    isEventToday 
                      ? 'border-rosegold-400 ring-2 ring-rosegold-100' 
                      : 'border-gray-100'
                  }`}
                >
                  {/* Event Header with Date, Badge & Actions */}
                  <div className="flex justify-between items-start pb-3 mb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rosegold-100 text-rosegold-800 text-[11px] font-extrabold flex items-center justify-center">
                          {index + 1}
                        </span>
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

                      {/* Multi-type Pills & Event Title */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {eventTypesList.map((type, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rosegold-50 text-rosegold-700 border border-rosegold-200"
                          >
                            {type}
                          </span>
                        ))}
                        {booking.event_name && (
                          <span className="text-xs font-medium text-gray-600">
                            • {booking.event_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                        booking.status === 'Confirmed' ? 'bg-green-50 text-green-700' :
                        booking.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        booking.status === 'Completed' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                      <button
                        onClick={() => openEditBookingModal(booking)}
                        className="p-1.5 text-gray-400 hover:text-rosegold-600 rounded-lg hover:bg-rosegold-50 transition-colors ml-1 cursor-pointer"
                        title="Edit Event Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking.id, booking.event_name || booking.event_type)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 size={14} />
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
                        <MapPin size={14} className="text-rosegold-600 shrink-0 mt-0.5" />
                        <span className="flex-1 text-gray-800 font-medium">{booking.location}</span>
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

                  {/* Payment Details with Advance Amount History */}
                  {payment && (
                    <div className="mt-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
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
                              className="text-[11px] font-bold text-rosegold-700 hover:text-rosegold-800 flex items-center gap-0.5 bg-rosegold-100 hover:bg-rosegold-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus size={12} /> Add Payment
                            </button>
                          )}
                        </div>

                        {installments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-1">No payment installments recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {installments.map((inst, idx) => (
                              <div
                                key={inst.id || idx}
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
                              className="text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
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
                                className="flex-1 bg-rosegold-600 hover:bg-rosegold-700 text-white text-xs font-bold py-2 rounded-xl transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* ======================================================== */}
      {/* MODAL 1: PERFECT TABBED EDIT CLIENT MODAL                */}
      {/* ======================================================== */}
      {isEditClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-none sm:fade-in sm:zoom-in-95 duration-200">
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 size={16} className="text-rosegold-600" /> Edit Client & Bookings
                </h3>
                <p className="text-xs text-gray-500">Update client profile, package pricing, and all functions</p>
              </div>
              <button
                onClick={() => setIsEditClientModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="flex bg-gray-100/90 p-1 rounded-2xl gap-1 mx-4 sm:mx-6 my-2.5 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setEditModalTab('profile')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  editModalTab === 'profile'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <User size={14} className={editModalTab === 'profile' ? 'text-rosegold-600' : 'text-gray-400'} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('billing')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  editModalTab === 'billing'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <CreditCard size={14} className={editModalTab === 'billing' ? 'text-rosegold-600' : 'text-gray-400'} />
                <span>Billing</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('events')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  editModalTab === 'events'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <CalendarIcon size={14} className={editModalTab === 'events' ? 'text-rosegold-600' : 'text-gray-400'} />
                <span>Events ({editEvents.length})</span>
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleSaveClient} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 overscroll-contain">
                {/* TAB 1: Profile & Contact */}
                {editModalTab === 'profile' && (
                  <div className="space-y-4 animate-in fade-in duration-150 py-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Sravani Rao"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base sm:text-xs transition-all font-medium text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                          <input
                            required
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={editClientPhone}
                            onChange={(e) => setEditClientPhone(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base sm:text-xs transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          WhatsApp Number
                        </label>
                        <div className="relative">
                          <MessageCircle size={15} className="absolute left-3.5 top-3.5 text-green-500" />
                          <input
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={editClientWhatsapp}
                            onChange={(e) => setEditClientWhatsapp(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base sm:text-xs transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Instagram Handle
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-pink-500 font-bold text-base sm:text-sm">@</span>
                        <input
                          type="text"
                          placeholder="sravani_makeovers"
                          value={editClientInstagram}
                          onChange={(e) => setEditClientInstagram(e.target.value.replace('@', ''))}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base sm:text-xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Package Billing & Financials */}
                {editModalTab === 'billing' && (
                  <div className="space-y-4 animate-in fade-in duration-150 py-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Total Package Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editTotalAmount}
                          onChange={(e) => setEditTotalAmount(e.target.value)}
                          placeholder="e.g. 25000"
                          className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base font-extrabold text-gray-900 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Total Advance Paid (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editAdvanceAmount}
                          onChange={(e) => setEditAdvanceAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-rosegold-500 focus:ring-2 focus:ring-rosegold-100 outline-none text-base font-extrabold text-green-700 transition-all"
                        />
                      </div>
                    </div>

                    {/* Live Balance Summary Card */}
                    <div className="bg-gradient-to-br from-rosegold-50/80 to-white p-4 rounded-2xl border border-rosegold-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Remaining Balance Due</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Calculated automatically (Total - Advance)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-rosegold-700">
                          ₹{editModalRemaining.toLocaleString('en-IN')}
                        </span>
                        <div className="mt-0.5">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            editModalRemaining === 0 && Number(editTotalAmount) > 0 ? 'bg-green-100 text-green-700' :
                            Number(editAdvanceAmount) > 0 ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {editModalRemaining === 0 && Number(editTotalAmount) > 0 ? 'Fully Paid' : Number(editAdvanceAmount) > 0 ? 'Partially Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Client Events */}
                {editModalTab === 'events' && (
                  <div className="space-y-4 animate-in fade-in duration-150 py-1">
                    <div className="flex justify-between items-center px-0.5">
                      <p className="text-xs text-gray-500 font-medium">
                        Manage all {editEvents.length} function(s)
                      </p>
                      <button
                        type="button"
                        onClick={handleAddEventInEditModal}
                        className="text-xs font-bold text-rosegold-700 hover:text-rosegold-800 bg-rosegold-100 hover:bg-rosegold-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>

                    {editEvents.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                        <p className="mb-2">No events currently attached to this client.</p>
                        <button
                          type="button"
                          onClick={handleAddEventInEditModal}
                          className="font-bold text-rosegold-600 hover:underline cursor-pointer"
                        >
                          + Add First Event
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {editEvents.map((ev, index) => (
                          <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-2xs space-y-3.5">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-rosegold-500 text-white text-xs font-black flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                  Event #{index + 1} {ev.eventName ? `• ${ev.eventName}` : ''}
                                </span>
                              </div>

                              {editEvents.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEventInEditModal(ev.id)}
                                  className="text-xs font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} /> Remove
                                </button>
                              )}
                            </div>

                            {/* Event Types with Auto-Saved Memory */}
                            <EventTypeSelector
                              selectedTypes={ev.eventTypes}
                              onChange={(types) => updateEditEventField(ev.id, 'eventTypes', types)}
                              required
                            />

                            {/* Event Title */}
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Function / Event Title
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Mehendi Ceremony / Muhurtham"
                                value={ev.eventName}
                                onChange={(e) => updateEditEventField(ev.id, 'eventName', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:bg-white focus:ring-2 focus:ring-rosegold-500 focus:border-rosegold-500 transition-all"
                              />
                            </div>

                            {/* Date & Times */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                                  <CalendarIcon size={12} className="text-rosegold-600" /> Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                  required
                                  type="date"
                                  value={ev.eventDate}
                                  onChange={(e) => updateEditEventField(ev.id, 'eventDate', e.target.value)}
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-base sm:text-xs font-medium outline-none focus:ring-2 focus:ring-rosegold-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:contents">
                                <div>
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                    <Clock size={12} className="text-gray-400" /> Event Time
                                  </label>
                                  <input
                                    type="time"
                                    value={ev.eventTime}
                                    onChange={(e) => updateEditEventField(ev.id, 'eventTime', e.target.value)}
                                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:ring-2 focus:ring-rosegold-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                    <Clock size={12} className="text-rosegold-500" /> Reporting Time
                                  </label>
                                  <input
                                    type="time"
                                    value={ev.reportingTime}
                                    onChange={(e) => updateEditEventField(ev.id, 'reportingTime', e.target.value)}
                                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:ring-2 focus:ring-rosegold-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Venue / Location */}
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <MapPin size={12} className="text-rosegold-600" /> Venue / Location
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Hotel Novotel, Banjara Hills, Hyderabad"
                                value={ev.location}
                                onChange={(e) => updateEditEventField(ev.id, 'location', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:bg-white focus:ring-2 focus:ring-rosegold-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={ev.status}
                                  onChange={(e) => updateEditEventField(ev.id, 'status', e.target.value)}
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-base sm:text-xs font-medium outline-none focus:ring-2 focus:ring-rosegold-500"
                                >
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                  <Users size={12} className="text-gray-400" /> Guests / People
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 5"
                                  value={ev.numberOfPeople}
                                  onChange={(e) => updateEditEventField(ev.id, 'numberOfPeople', e.target.value)}
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:ring-2 focus:ring-rosegold-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Special Notes / Requirements
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Saree draping first"
                                value={ev.notes}
                                onChange={(e) => updateEditEventField(ev.id, 'notes', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs outline-none focus:bg-white focus:ring-2 focus:ring-rosegold-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer (Sticky at bottom on Mobile) */}
              <div className="bg-white/95 backdrop-blur-xs border-t border-gray-100 px-4 sm:px-6 py-3 flex gap-2.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="flex-1 py-3 bg-gradient-to-r from-rosegold-600 to-rosegold-500 hover:from-rosegold-700 hover:to-rosegold-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingClient ? (
                    <span>Saving All Changes...</span>
                  ) : (
                    <>
                      <Check size={16} className="stroke-[3]" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Add Event / Function to this Client Modal       */}
      {/* ======================================================== */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-none sm:fade-in sm:zoom-in-95 duration-200">
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <PlusCircle size={17} className="text-rosegold-600" /> Add Event for {client.name}
                </h3>
                <p className="text-xs text-gray-500">Add another function with different date & location</p>
              </div>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewEvent} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain">
                <EventTypeSelector
                  selectedTypes={newEventTypes}
                  onChange={setNewEventTypes}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Event Name / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mehendi Night / Haldi Function"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <CalendarIcon size={12} className="text-rosegold-600" /> Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs font-medium bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" /> Event Time
                      </label>
                      <input
                        type="time"
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-rosegold-500" /> Reporting Time
                      </label>
                      <input
                        type="time"
                        value={newReportingTime}
                        onChange={(e) => setNewReportingTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin size={12} className="text-rosegold-600" /> Location / Venue
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Venue / Banquet / Client's Residence"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Users size={12} className="text-gray-400" /> Guests / People
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1"
                      value={newNumberOfPeople}
                      onChange={(e) => setNewNumberOfPeople(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Additional Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5000"
                      value={newEventAmount}
                      onChange={(e) => setNewEventAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Special Notes / Requirements
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Needs flowers ready by 8 AM"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-xs border-t border-gray-100 px-5 sm:px-6 py-3 flex gap-2.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewEvent}
                  className="flex-1 py-3 bg-rosegold-600 hover:bg-rosegold-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSavingNewEvent ? 'Saving Event...' : 'Add Event to Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Individual Edit Existing Event Modal            */}
      {/* ======================================================== */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-none sm:fade-in sm:zoom-in-95 duration-200">
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 size={16} className="text-rosegold-600" /> Edit Event Details
                </h3>
                <p className="text-xs text-gray-500">Update event types, date, time, venue, or status</p>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditEvent} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain">
                <EventTypeSelector
                  selectedTypes={editBookingTypes}
                  onChange={setEditBookingTypes}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Event Title / Name
                  </label>
                  <input
                    type="text"
                    value={editBookingName}
                    onChange={(e) => setEditBookingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <CalendarIcon size={12} className="text-rosegold-600" /> Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={editBookingDate}
                      onChange={(e) => setEditBookingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs font-medium bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" /> Event Time
                      </label>
                      <input
                        type="time"
                        value={editBookingTime}
                        onChange={(e) => setEditBookingTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-rosegold-500" /> Reporting Time
                      </label>
                      <input
                        type="time"
                        value={editBookingReportingTime}
                        onChange={(e) => setEditBookingReportingTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin size={12} className="text-rosegold-600" /> Location / Venue
                  </label>
                  <textarea
                    rows={2}
                    value={editBookingLocation}
                    onChange={(e) => setEditBookingLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Event Status
                    </label>
                    <select
                      value={editBookingStatus}
                      onChange={(e) => setEditBookingStatus(e.target.value)}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Users size={12} className="text-gray-400" /> Guests / People
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={editBookingNumberOfPeople}
                      onChange={(e) => setEditBookingNumberOfPeople(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={editBookingNotes}
                    onChange={(e) => setEditBookingNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rosegold-500 outline-none text-base sm:text-xs"
                  />
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-xs border-t border-gray-100 px-5 sm:px-6 py-3 flex gap-2.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditEvent}
                  className="flex-1 py-3 bg-rosegold-600 hover:bg-rosegold-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSavingEditEvent ? 'Saving...' : 'Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
