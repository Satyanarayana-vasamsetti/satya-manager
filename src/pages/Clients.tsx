import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';
import { Search, Phone, MessageCircle, Trash2, Calendar, ChevronRight, ArrowUpDown, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'oldest'>('newest');

  const fetchClients = async () => {
    setLoading(true);
    // Order by entry order (created_at descending) by default
    const { data, error } = await supabase
      .from('clients')
      .select('*, bookings(*, services(*), payments(*))')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setClients(data as Client[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will also delete ALL their bookings and payments permanently.`)) {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients();
    }
  };

  const filteredAndSortedClients = clients
    .filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.phone && c.phone.includes(search))
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      if (sortBy === 'oldest') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-4 pb-24">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-xs text-gray-500 font-medium">Sorted by entry order (newest first)</p>
        </div>
        <Link 
          to="/add-booking" 
          className="bg-rosegold-500 hover:bg-rosegold-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          + New Client
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <input 
          type="text" 
          placeholder="Search by client name or phone..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white px-4 py-3 pl-11 rounded-2xl shadow-sm border border-gray-100 focus:ring-2 focus:ring-rosegold-500 outline-none text-sm"
        />
        <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
      </div>

      {/* Sort Selector Bar */}
      <div className="flex items-center justify-between mb-5 px-1 text-xs">
        <span className="text-gray-500 font-medium flex items-center gap-1">
          <ArrowUpDown size={13} className="text-rosegold-600" /> Sort:
        </span>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl font-semibold">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'newest'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Entry Order
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'name'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            A - Z
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'oldest'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Oldest
          </button>
        </div>
      </div>

      {/* Clients List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-8 h-8 border-3 border-rosegold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading clients in entry order...</p>
        </div>
      ) : filteredAndSortedClients.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-500 text-sm">
          No clients found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedClients.map((client) => {
            const bookings = client.bookings || [];
            const bookingCount = bookings.length;

            // Total balance
            let totalRemaining = 0;
            bookings.forEach(b => {
              b.payments?.forEach(p => {
                totalRemaining += Number(p.remaining_amount || 0);
              });
            });

            // Find next upcoming or latest booking date
            const today = new Date().toISOString().split('T')[0];
            const upcoming = bookings
              .filter(b => b.event_date >= today)
              .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
            const latest = bookings
              .slice()
              .sort((a, b) => b.event_date.localeCompare(a.event_date))[0];
            const displayBooking = upcoming || latest;

            return (
              <div 
                key={client.id} 
                className="bg-white p-4.5 rounded-3xl shadow-sm border border-gray-100 hover:border-rosegold-200 transition-all flex flex-col gap-3"
              >
                {/* Header: Name, Initials, Delete */}
                <div className="flex justify-between items-start">
                  <Link 
                    to={`/clients/${client.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-rosegold-400 to-rosegold-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-rosegold-600 transition-colors">
                          {client.name}
                        </h3>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      {client.phone && (
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{client.phone}</p>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 ml-2">
                    <Link
                      to={`/clients/${client.id}?edit=true`}
                      className="text-gray-400 hover:text-rosegold-600 p-2 rounded-xl hover:bg-rosegold-50 transition-colors"
                      title="Edit Client"
                    >
                      <Edit2 size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(client.id, client.name)}
                      className="text-gray-300 hover:text-red-500 active:bg-red-50 p-2 rounded-xl transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Badges / Summary Info */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                    {bookingCount} {bookingCount === 1 ? 'Event' : 'Events'}
                  </span>

                  {totalRemaining > 0 ? (
                    <span className="bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-lg">
                      Pending: ₹{totalRemaining.toLocaleString('en-IN')}
                    </span>
                  ) : bookingCount > 0 ? (
                    <span className="bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-lg">
                      All Paid
                    </span>
                  ) : null}

                  {displayBooking && (
                    <span className="bg-rosegold-50 text-rosegold-700 font-medium px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Calendar size={12} />
                      {upcoming ? 'Upcoming:' : 'Last:'} {format(parseISO(displayBooking.event_date), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>

                {/* Quick Actions (Call, WhatsApp, Instagram, View Full Profile) */}
                <div className="flex items-center gap-2 mt-1 border-t border-gray-100 pt-3">
                  {client.phone && (
                    <a 
                      href={`tel:${client.phone}`} 
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rosegold-50 hover:bg-rosegold-100 text-rosegold-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Phone size={14} /> Call
                    </a>
                  )}
                  {client.whatsapp && (
                    <a 
                      href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  {client.instagram && (
                    <a 
                      href={`https://instagram.com/${client.instagram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                      title="Instagram"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg>
                    </a>
                  )}
                  <Link
                    to={`/clients/${client.id}`}
                    className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
