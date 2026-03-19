import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { COUNSELORS, getCounselorForMenu } from '@/data/counselors';
import { Star, Gift, Sparkles } from 'lucide-react';

interface Product {
  menu_id: number;
  name: string;
  icon: string | null;
  price: number;
  category: string;
  category_name: string;
  description: string | null;
  enabled: boolean | null;
  is_snack: boolean | null;
  counselor_id: string | null;
}

interface Review {
  id: string;
  masked_name: string;
  content: string;
  rating: number;
  menu_name: string | null;
  created_at: string;
}

interface LandingPageProps {
  onStartChat: (menuId?: number) => void;
  couponActive: boolean;
  userCredits: number;
  userName: string;
  onCheckCredits: () => void;
}

export default function LandingPage({ onStartChat, couponActive, userCredits, userName, onCheckCredits }: LandingPageProps) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: revs } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (revs) setReviews(revs as any);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-svh aurora-bg">
      {/* Coupon Banner */}
      {couponActive && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-50 bg-gradient-to-r from-primary to-glow-pink text-primary-foreground text-center py-2.5 px-4 text-xs font-semibold"
        >
          💫 하울랜드에서 오신 당신! 9,900원 이상 결제 시 3,000원 자동 할인 중
        </motion.div>
      )}

      {/* Hero Banner */}
      <section className="relative overflow-hidden px-4 pt-14 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-2">KOK TAROT</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-3 neon-glow">
              콕타로
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              당신의 운명을 콕 집어줄게
            </p>
          </motion.div>

          {/* Counselor Avatars */}
          <div className="flex justify-center gap-4 mb-8">
            {COUNSELORS.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onStartChat()}
                className="text-center group"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/30 ring-offset-2 ring-offset-background mx-auto group-hover:ring-primary/60 transition-all">
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[11px] font-semibold text-foreground mt-1.5">{c.name}</p>
                <p className="text-[9px] text-muted-foreground">{c.specialty}</p>
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => onStartChat()}
            className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg glow-border-hover transition-all active:scale-[0.98]"
          >
            ✨ 상담 시작하기
          </button>
        </div>
      </section>

      {/* Credits Check */}
      {userName && (
        <section className="px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={onCheckCredits}
              className="w-full glass-strong rounded-2xl p-4 flex items-center justify-between glow-border hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">내 적립금</p>
                  <p className="text-xs text-muted-foreground">{userName}님의 혜택</p>
                </div>
              </div>
              <span className="text-lg font-bold text-primary">{userCredits.toLocaleString()}원</span>
            </button>
          </div>
        </section>
      )}

      {/* Best Reviews */}
      <section className="px-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-lg font-bold text-foreground mb-3 px-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> 베스트 후기
          </h2>
          {reviews.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {reviews.map(r => (
                <div key={r.id} className="glass-strong rounded-2xl p-4 min-w-[240px] max-w-[280px] flex-shrink-0 glow-border">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-xs text-foreground line-clamp-3 mb-2">{r.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{r.masked_name}</span>
                    {r.menu_name && <span className="text-[10px] text-primary font-medium">{r.menu_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-6 text-center glow-border">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">첫 후기를 남기고 적립금을 받아보세요! ✨</p>
            </div>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="px-4 pb-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            본 서비스는 데이터 분석을 기반으로 한 인사이트 에듀테인먼트 콘텐츠이며, 상담 결과는 자기 탐색을 위한 참고 자료일 뿐 법적 책임을 보장하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
