-- Supabase Schema for Satya Makeovers Manager
-- No Authentication Required version

-- 1. Clients Table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads Table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  event_type TEXT,
  expected_event_date DATE,
  budget NUMERIC(10,2),
  status TEXT DEFAULT 'New Lead', -- New Lead, Contacted, Interested, Confirmed, Not Interested
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  reporting_time TIME,
  location TEXT,
  maps_link TEXT,
  number_of_people INTEGER DEFAULT 1,
  notes TEXT,
  special_requirements TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Confirmed, Completed, Cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Services Table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL
);

-- 5. Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(10,2) DEFAULT 0,
  remaining_amount NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending', -- Pending, Partial, Paid
  payment_method TEXT, -- Cash, UPI, Bank Transfer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reminders Table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT,
  reminder_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tasks Table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium', -- High, Medium, Low
  status TEXT DEFAULT 'Pending', -- Pending, Completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow anonymous access (since we are not using authentication)
-- This is secure ONLY because the Supabase URL/Key is not public and this is a private app.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Set up Storage for Gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
CREATE POLICY "Allow public access to gallery" ON storage.objects FOR ALL USING (bucket_id = 'gallery') WITH CHECK (bucket_id = 'gallery');
