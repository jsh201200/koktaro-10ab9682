-- user_profiles: phone-based identification with PIN
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  pin text NOT NULL,
  nickname text,
  birth_date text,
  birth_time text,
  birth_type text DEFAULT 'solar',
  gender text,
  credits integer NOT NULL DEFAULT 0,
  coupon_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.user_profiles FOR UPDATE TO public USING (true);

-- reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id),
  profile_id uuid REFERENCES public.user_profiles(id),
  user_nickname text NOT NULL,
  masked_name text NOT NULL,
  content text NOT NULL,
  rating integer DEFAULT 5,
  menu_name text,
  is_approved boolean DEFAULT false,
  credits_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update reviews" ON public.reviews FOR UPDATE TO public USING (true);

-- Add duration_minutes and counselor_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS counselor_id text;

-- Add profile_id to chat_sessions
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);

-- Add discount columns to payments  
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS final_price integer;

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;