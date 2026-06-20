import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Analytics() {
  const [data, setData] = useState<{name: string, revenue: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      // Very basic example: aggregate total revenue from payments
      const { data: payments } = await supabase.from('payments').select('total_amount, created_at');
      
      if (payments) {
        // Group by month
        const monthlyData = payments.reduce((acc, curr) => {
          const month = new Date(curr.created_at).toLocaleString('default', { month: 'short' });
          if (!acc[month]) acc[month] = 0;
          acc[month] += Number(curr.total_amount);
          return acc;
        }, {} as Record<string, number>);

        const formattedData = Object.keys(monthlyData).map(key => ({
          name: key,
          revenue: monthlyData[key]
        }));
        
        setData(formattedData);
      }
      setLoading(false);
    }
    
    fetchAnalytics();
  }, []);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Analytics & Reports</h1>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Monthly Revenue</h2>
        
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">Loading data...</div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">No data available yet.</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `₹${value}`} />
                <Tooltip cursor={{fill: '#fcf9f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="revenue" fill="#b76e79" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
