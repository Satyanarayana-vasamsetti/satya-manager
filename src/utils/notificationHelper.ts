import type { Booking } from '../types';
import { differenceInCalendarDays, parseISO, isToday, isTomorrow, format } from 'date-fns';

export interface AppNotification {
  id: string;
  type: 'event_today' | 'event_upcoming' | 'payment_pending' | 'general';
  title: string;
  message: string;
  date?: string;
  link?: string;
  priority: 'high' | 'medium' | 'low';
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendDeviceNotification('Notifications Activated 🔔', {
        body: 'Satya Makeovers Manager will remind you of appointments & payments!',
        icon: '/favicon.svg'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export function sendDeviceNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      badge: '/favicon.svg',
      icon: '/favicon.svg',
      ...options
    });
  } catch (err) {
    console.warn('Could not show browser notification:', err);
  }
}

/**
 * Computes all active in-app notifications from current bookings
 */
export function generateNotificationsFromBookings(bookings: Booking[]): AppNotification[] {
  const notifications: AppNotification[] = [];
  const today = new Date();

  bookings.forEach((b) => {
    try {
      const eventDate = parseISO(b.event_date);
      const daysUntil = differenceInCalendarDays(eventDate, today);

      // Event Today Alert
      if (isToday(eventDate)) {
        notifications.push({
          id: `today-${b.id}`,
          type: 'event_today',
          title: `Today: ${b.event_type} for ${b.client?.name || 'Client'}`,
          message: `Reporting time: ${b.reporting_time ? b.reporting_time.substring(0, 5) : 'TBD'}${b.location ? ` at ${b.location}` : ''}`,
          date: b.event_date,
          link: `/clients/${b.client_id}`,
          priority: 'high'
        });
      } 
      // Event Tomorrow or within 2 days
      else if (isTomorrow(eventDate) || (daysUntil > 0 && daysUntil <= 2)) {
        notifications.push({
          id: `upcoming-${b.id}`,
          type: 'event_upcoming',
          title: `Upcoming in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}: ${b.event_type}`,
          message: `${b.client?.name || 'Client'} • ${format(eventDate, 'EEE, d MMM')}${b.location ? ` • ${b.location}` : ''}`,
          date: b.event_date,
          link: `/clients/${b.client_id}`,
          priority: 'medium'
        });
      }

      // Payment Pending for imminent events
      if (b.payments && b.payments.length > 0) {
        const payment = b.payments[0];
        const remaining = Number(payment.remaining_amount || 0);
        if (remaining > 0 && daysUntil >= 0 && daysUntil <= 5) {
          notifications.push({
            id: `pay-${b.id}`,
            type: 'payment_pending',
            title: `Payment Pending: ₹${remaining.toLocaleString('en-IN')}`,
            message: `${b.client?.name} owes balance for ${b.event_type} on ${format(eventDate, 'd MMM')}`,
            date: b.event_date,
            link: `/clients/${b.client_id}`,
            priority: daysUntil <= 1 ? 'high' : 'medium'
          });
        }
      }
    } catch {
      // ignore invalid date errors
    }
  });

  return notifications;
}

/**
 * Checks for upcoming events and sends device notifications if not already sent today
 */
export function checkAndSendEventAlerts(bookings: Booking[]) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = 'last_notified_event_date';
  const lastNotified = localStorage.getItem(storageKey);

  if (lastNotified === todayStr) return; // already sent alerts today

  const notifs = generateNotificationsFromBookings(bookings).filter(n => n.priority === 'high');
  if (notifs.length > 0) {
    const first = notifs[0];
    sendDeviceNotification(first.title, {
      body: first.message
    });
    localStorage.setItem(storageKey, todayStr);
  }
}
