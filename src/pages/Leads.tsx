import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types';
import { Phone, MessageCircle, Plus, X } from 'lucide-react';

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form
  const [leadName, setLeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !phone) return;
    
    const { error } = await supabase.from('leads').insert({
      lead_name: leadName,
      phone,
      event_type: eventType,
      status: 'New Lead'
    });
    
    if (!error) {
      setShowAddForm(false);
      setLeadName('');
      setPhone('');
      setEventType('');
      fetchLeads();
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    fetchLeads();
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
        <button onClick={() => setShowAddForm(true)} className="bg-rosegold-100 text-rosegold-700 p-2 rounded-full active:bg-rosegold-200">
          <Plus size={24} />
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 relative animate-in slide-in-from-bottom-10">
            <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 text-gray-400 p-2">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input required type="text" value={leadName} onChange={e => setLeadName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <input type="text" value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. Bridal, Party" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rosegold-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-rosegold-600 text-white font-bold py-3 rounded-xl mt-2 active:scale-[0.98] transition-all">
                Save Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500">
          No active leads.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 text-lg">{lead.lead_name}</h3>
                <select 
                  value={lead.status} 
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                  className={`text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer ${
                    lead.status === 'New Lead' ? 'bg-blue-50 text-blue-700' :
                    lead.status === 'Contacted' ? 'bg-yellow-50 text-yellow-700' :
                    lead.status === 'Confirmed' ? 'bg-green-50 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  <option value="New Lead">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
              
              {(lead.phone || lead.event_type) && (
                <div className="text-sm text-gray-600 mb-3 space-y-1">
                  {lead.phone && <p>{lead.phone}</p>}
                  {lead.event_type && <p>Event: <span className="font-medium text-gray-800">{lead.event_type}</span></p>}
                </div>
              )}
              
              <div className="flex gap-2 border-t border-gray-50 pt-3">
                {lead.phone && (
                  <>
                    <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-medium active:bg-gray-100">
                      <Phone size={16} /> Call
                    </a>
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-medium active:bg-green-100">
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
