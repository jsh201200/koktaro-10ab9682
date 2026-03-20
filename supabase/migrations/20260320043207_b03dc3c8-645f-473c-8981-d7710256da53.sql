
-- Coupons table for admin-managed coupons
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  discount_amount integer NOT NULL DEFAULT 0,
  min_price integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are publicly readable" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete coupons" ON public.coupons FOR DELETE USING (true);

-- Seed default coupon (migrated from hardcoded HOWL3000)
INSERT INTO public.coupons (name, code, discount_amount, min_price, is_active)
VALUES ('콕타로 오픈 기념 할인', 'HOWL3000', 3000, 9900, true);

-- Add banner/footer/popup fields to site_config if not exists
INSERT INTO public.site_config (key, value) VALUES ('banner_text', '"💫 콕타로에 오신 당신! 9,900원 이상 결제 시 3,000원 자동 할인 중"') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_config (key, value) VALUES ('popup_notice', '""') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_config (key, value) VALUES ('footer_business_info', '"본 서비스는 데이터 분석을 기반으로 한 인사이트 에듀테인먼트 콘텐츠이며, 상담 결과는 자기 탐색을 위한 참고 자료일 뿐 법적 책임을 보장하지 않습니다."') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_config (key, value) VALUES ('hero_title', '"콕타로"') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.site_config (key, value) VALUES ('hero_subtitle', '"당신의 운명을 콕 집어줄게"') ON CONFLICT (key) DO NOTHING;
