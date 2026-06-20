export function getGoogleCalendarUrl(booking: any) {
  const text = encodeURIComponent(`${booking.event_name}`);
  
  let detailsText = `Client: ${booking.client?.name || 'Unknown'}\n`;
  if (booking.client?.phone) detailsText += `Phone: ${booking.client.phone}\n`;
  if (booking.reporting_time) detailsText += `Reporting Time: ${booking.reporting_time}\n`;
  if (booking.services && booking.services.length > 0) {
    detailsText += `Services: ${booking.services.map((s: any) => s.service_name).join(', ')}\n`;
  }
  
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(booking.location || '');
  
  // Create Date objects in local time, then convert to UTC string format required by Google Calendar
  // Format: YYYYMMDDTHHmmssZ
  
  let startD = new Date(booking.event_date);
  if (booking.reporting_time) {
    const [hours, minutes] = booking.reporting_time.split(':');
    startD.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
  } else if (booking.event_time) {
    const [hours, minutes] = booking.event_time.split(':');
    startD.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
  } else {
    startD.setHours(9, 0, 0); // Default to 9 AM
  }

  // End time is 2 hours after start time by default
  let endD = new Date(startD.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatGoogleDate(startD)}/${formatGoogleDate(endD)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}
