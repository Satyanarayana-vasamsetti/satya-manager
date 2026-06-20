export interface Client {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_name: string;
  phone: string | null;
  whatsapp: string | null;
  event_type: string | null;
  expected_event_date: string | null;
  budget: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  reporting_time: string | null;
  location: string | null;
  maps_link: string | null;
  number_of_people: number;
  notes: string | null;
  special_requirements: string | null;
  status: string;
  created_at: string;
  client?: Client;
  services?: Service[];
  payments?: Payment[];
}

export interface Service {
  id: string;
  booking_id: string;
  service_name: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  payment_status: string;
  payment_method: string | null;
}
