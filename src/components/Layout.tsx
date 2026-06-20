import { Outlet, NavLink } from 'react-router-dom';
import { Home, Calendar, PlusCircle, User, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: PlusCircle, label: 'Add', path: '/add-booking' },
  { icon: User, label: 'Clients', path: '/clients' },
  { icon: FileText, label: 'More', path: '/more' },
];

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto relative bg-white shadow-sm h-full min-h-screen">
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-rosegold-100 px-4 py-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-rosegold-400 hover:bg-rosegold-50'
                )
              }
            >
              <item.icon
                className={cn('w-6 h-6 transition-transform', item.path === '/add-booking' && 'w-8 h-8 -mt-4 bg-primary text-white rounded-full p-1.5 shadow-lg')}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
