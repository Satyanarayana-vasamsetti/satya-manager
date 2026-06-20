import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';
import { Search, Phone, MessageCircle, Link } from 'lucide-react';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setClients(data as Client[]);
      }
      setLoading(false);
    }
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Clients</h1>
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rosegold-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No clients found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                  {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                </div>
                <div className="w-10 h-10 bg-rosegold-50 rounded-full flex items-center justify-center text-rosegold-700 font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="flex gap-2 mt-1 pt-3 border-t border-gray-50">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-medium active:bg-gray-100">
                    <Phone size={16} /> Call
                  </a>
                )}
                {client.whatsapp && (
                  <a href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-medium active:bg-green-100">
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                )}
                {client.instagram && (
                  <a href={`https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center px-4 bg-pink-50 text-pink-700 rounded-xl active:bg-pink-100">
                    <Link size={18} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
