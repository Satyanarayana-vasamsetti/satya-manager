import { useState } from 'react';
import { 
  X, 
  Bell, 
  Calendar, 
  CreditCard, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppNotification } from '../utils/notificationHelper';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendDeviceNotification 
} from '../utils/notificationHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
}

export function NotificationModal({ isOpen, onClose, notifications }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  const handleTestNotification = () => {
    sendDeviceNotification('Satya Makeovers Reminder 💄', {
      body: 'Notifications are working! You will receive alerts for appointments & payments.',
      icon: '/favicon.svg'
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rosegold-100 text-rosegold-700 rounded-xl">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">Notifications</h3>
              <p className="text-xs text-gray-500 font-medium">
                {notifications.length} active {notifications.length === 1 ? 'alert' : 'alerts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Device Notification Status Card */}
        <div className="p-4 bg-rosegold-50/70 border-b border-rosegold-100">
          {permission === 'granted' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">Device notifications are ON</span>
              </div>
              <button
                onClick={handleTestNotification}
                className="text-[11px] font-bold text-rosegold-700 bg-white hover:bg-rosegold-100 border border-rosegold-200 px-3 py-1 rounded-lg transition-colors shadow-2xs"
              >
                {testSent ? 'Sent! ✓' : 'Test Alert'}
              </button>
            </div>
          ) : permission === 'denied' ? (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>Browser notifications blocked. Enable in your browser address bar settings.</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-900">Enable Device Alerts</p>
                <p className="text-[11px] text-gray-600">Get reminders on your phone & desktop</p>
              </div>
              <button
                onClick={handleEnableNotifications}
                className="bg-rosegold-500 hover:bg-rosegold-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors shrink-0"
              >
                Turn On
              </button>
            </div>
          )}
        </div>

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700 text-sm">All caught up!</p>
              <p className="text-xs text-gray-400 mt-0.5">No urgent reminders right now.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isTodayAlert = item.type === 'event_today';
              const isPayment = item.type === 'payment_pending';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isTodayAlert
                      ? 'bg-rosegold-50/50 border-rosegold-200 ring-1 ring-rosegold-200'
                      : isPayment
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-gray-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isTodayAlert ? 'bg-rosegold-500 text-white' :
                      isPayment ? 'bg-amber-500 text-white' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {isTodayAlert ? <Clock size={15} /> :
                       isPayment ? <CreditCard size={15} /> :
                       <Calendar size={15} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-gray-900 text-xs truncate">{item.title}</h4>
                        {isTodayAlert && (
                          <span className="text-[9px] font-extrabold uppercase bg-rosegold-500 text-white px-1.5 py-0.5 rounded-md shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.message}</p>

                      {item.link && (
                        <div className="mt-2 flex justify-end">
                          <Link
                            to={item.link}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rosegold-700 hover:text-rosegold-800"
                          >
                            View Client <ExternalLink size={10} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/80 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
