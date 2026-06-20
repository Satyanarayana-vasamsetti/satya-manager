import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  console.log("Starting test...");
  
  // 1. Create client
  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert({ name: "Demo User", phone: "1234567890", whatsapp: "" })
    .select('id')
    .single();
    
  if (clientError) {
    console.error("Client Error:", clientError);
    return;
  }
  console.log("Client created:", newClient.id);
  
  // 2. Create Booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: newClient.id,
      event_name: "Demo Event",
      event_type: "Wedding",
      event_date: "2026-06-25",
      event_time: null,
      reporting_time: null,
      location: "Demo Location",
      status: 'Confirmed'
    })
    .select('id')
    .single();
    
  if (bookingError) {
    console.error("Booking Error:", bookingError);
    return;
  }
  console.log("Booking created:", booking.id);
  
  // 3. Add Payment
  const { error: paymentError } = await supabase.from('payments').insert({
    booking_id: booking.id,
    total_amount: 1000,
    advance_amount: 0,
    remaining_amount: 1000,
    payment_status: 'Pending'
  });
  
  if (paymentError) {
    console.error("Payment Error:", paymentError);
    return;
  }
  console.log("Payment created successfully.");
  console.log("All done.");
}

testInsert();
