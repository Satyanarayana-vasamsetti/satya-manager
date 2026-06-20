import { Link } from 'react-router-dom';
import { Users, CreditCard, BarChart2, Settings, Bell, Download } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function More() {
  const menuItems = [
    { label: 'Lead Management', path: '/leads', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Payments', path: '/payments', icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Analytics & Reports', path: '/analytics', icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Tasks & Reminders', path: '/tasks', icon: Bell, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Settings', path: '/settings', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-50' },
  ];

  const { installApp } = useInstallPrompt();

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">More</h1>
      
      <div className="space-y-3">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
              <span className="font-semibold text-gray-800 text-lg">{item.label}</span>
            </div>
            <div className="text-gray-300">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <button 
          onClick={installApp}
          className="w-full bg-rosegold-600 text-white font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Download size={20} />
          Download App
        </button>
      </div>
      
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>Satya Makeovers Manager v1.0.0</p>
      </div>
    </div>
  );
}
