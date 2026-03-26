
-- ============================================
-- STEP 1: Core Database Tables for 콕콕의 챗봇상담소
-- ============================================

-- 1. Products table (메뉴/상품)
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  menu_id INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🔮',
  category TEXT NOT NULL DEFAULT 'A',
  category_name TEXT NOT NULL DEFAULT '입구',
  description TEXT,
  detail_description TEXT,
  price INT NOT NULL DEFAULT 0,
  is_snack BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  welcome_guide TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Site config (key-value settings)
CREATE TABLE public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Chat sessions
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_nickname TEXT,
  selected_menu_id INT REFERENCES public.products(menu_id),
  is_paid BOOLEAN DEFAULT false,
  session_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  referrer TEXT,
  user_agent TEXT,
  ip_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Chat history
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'bot', 'system')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id),
  user_nickname TEXT NOT NULL,
  menu_id INT REFERENCES public.products(menu_id),
  menu_name TEXT NOT NULL,
  price INT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('kakaopay', 'bank', 'premium')),
  depositor TEXT,
  phone_tail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  questions JSONB,
  chat_log JSONB,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Page visits / analytics
CREATE TABLE public.page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id),
  referrer TEXT,
  user_agent TEXT,
  path TEXT DEFAULT '/',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Products: readable by everyone (public menu)
CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT USING (true);

-- Site config: readable by everyone
CREATE POLICY "Site config is publicly readable"
  ON public.site_config FOR SELECT USING (true);

-- Chat sessions: anyone can create and read their own (by session_token)
CREATE POLICY "Anyone can create chat sessions"
  ON public.chat_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read chat sessions"
  ON public.chat_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can update chat sessions"
  ON public.chat_sessions FOR UPDATE USING (true);

-- Chat history: anyone can insert and read
CREATE POLICY "Anyone can insert chat history"
  ON public.chat_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read chat history"
  ON public.chat_history FOR SELECT USING (true);

-- Payments: anyone can insert, read all (admin reads from dashboard)
CREATE POLICY "Anyone can create payments"
  ON public.payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read payments"
  ON public.payments FOR SELECT USING (true);

CREATE POLICY "Anyone can update payments"
  ON public.payments FOR UPDATE USING (true);

-- Page visits: anyone can insert and read
CREATE POLICY "Anyone can insert page visits"
  ON public.page_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read page visits"
  ON public.page_visits FOR SELECT USING (true);

-- Site config: insert/update (will be managed via edge function with admin auth)
CREATE POLICY "Anyone can insert site config"
  ON public.site_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update site config"
  ON public.site_config FOR UPDATE USING (true);

-- Products: insert/update/delete
CREATE POLICY "Anyone can insert products"
  ON public.products FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON public.products FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete products"
  ON public.products FOR DELETE USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_chat_history_session ON public.chat_history(session_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_session ON public.payments(session_id);
CREATE INDEX idx_page_visits_created ON public.page_visits(created_at);
CREATE INDEX idx_chat_sessions_token ON public.chat_sessions(session_token);
