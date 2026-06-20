import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';
import { Search, Phone, MessageCircle, Link, Trash2 } from 'lucide-react';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
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

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Clients</h1>

      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder="Search clients..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white px-4 py-3 pl-11 rounded-2xl shadow-sm border border-gray-100 focus:ring-2 focus:ring-rosegold-500 outline-none"
        />
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No clients found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg flex items-center justify-between">
                    {client.name}
                    <button 
                      onClick={() => handleDelete(client.id, client.name)}
                      className="text-gray-400 hover:text-red-500 active:bg-red-50 p-2 rounded-lg transition-colors ml-2"
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </h3>
                  {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                </div>
                <div className="w-10 h-10 bg-rosegold-50 rounded-full flex items-center justify-center text-rosegold-700 font-bold ml-2 shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="flex gap-2 mt-2 border-t border-gray-50 pt-3">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex-1 flex flex-col items-center justify-center py-2 bg-gray-50 text-gray-700 rounded-xl active:bg-gray-100">
                    <Phone size={18} />
                  </a>
                )}
                {client.whatsapp && (
                  <a href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center justify-center py-2 bg-green-50 text-green-700 rounded-xl active:bg-green-100">
                    <MessageCircle size={18} />
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
