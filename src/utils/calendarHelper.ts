export function getGoogleCalendarUrl(booking: any) {
  const eventTitle = booking.event_name || booking.event_type || 'Makeover Appointment';
  const text = encodeURIComponent(eventTitle);
  
  let detailsText = `Client: ${booking.client?.name || 'Client'}\n`;
  if (booking.client?.phone) detailsText += `Phone: ${booking.client.phone}\n`;
  if (booking.reporting_time) detailsText += `Reporting Time: ${booking.reporting_time}\n`;
  if (booking.services && booking.services.length > 0) {
    detailsText += `Services: ${booking.services.map((s: any) => s.service_name).join(', ')}\n`;
  }
  
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(booking.location || '');
  
  const eventDateStr = booking.event_date || new Date().toISOString().split('T')[0];
  const startD = new Date(eventDateStr);
  if (booking.reporting_time && typeof booking.reporting_time === 'string' && booking.reporting_time.includes(':')) {
    const [hours, minutes] = booking.reporting_time.split(':');
    startD.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
  } else if (booking.event_time && typeof booking.event_time === 'string' && booking.event_time.includes(':')) {
    const [hours, minutes] = booking.event_time.split(':');
    startD.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
  } else {
    startD.setHours(9, 0, 0); // Default to 9 AM
  }

  // End time is 2 hours after start time by default
  const endD = new Date(startD.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (d: Date) => {
    try {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    } catch {
      return '';
    }
  };

  const dates = `${formatGoogleDate(startD)}/${formatGoogleDate(endD)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}
