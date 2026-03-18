import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { COUNSELORS, getCounselorForMenu } from '@/data/counselors';
import { ChevronRight, Star, Gift, Sparkles } from 'lucide-react';

interface Product {
  menu_id: number;
  name: string;
  icon: string | null;
  price: number;
  category: string;
  category_name: string;
  description: string | null;
  detail_description: string | null;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: prods }, { data: revs }] = await Promise.all([
        supabase.from('products').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('reviews').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
      ]);
      if (prods) setProducts(prods as any);
      if (revs) setReviews(revs as any);
    };
    fetchData();
  }, []);

  const categories = ['A', 'B', 'C', 'D'];
  const categoryLabels: Record<string, string> = {
    A: '🌟 입구 · 본질 분석',
    B: '🔮 메인 · 심층 리딩',
    C: '⭐ 스페셜 · 특정 고민',
    D: '💎 프리미엄',
  };

  return (
    <div className="min-h-svh aurora-bg">
      {/* Coupon Banner */}
      {couponActive && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-50 bg-gradient-to-r from-primary to-glow-purple text-primary-foreground text-center py-2.5 px-4 text-xs font-semibold"
        >
          💫 하울랜드에서 오신 당신! 9,900원 이상 결제 시 3,000원 자동 할인 중
        </motion.div>
      )}

      {/* Hero Banner */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-secondary-foreground mb-3">
              하울의 챗봇상담소
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              천상계 6인의 도사가 당신의 운명을 읽어드립니다
            </p>
          </motion.div>

          {/* Counselor Avatars Row */}
          <div className="flex justify-center gap-3 mb-6">
            {COUNSELORS.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-lg outline outline-2 outline-primary/30 outline-offset-1 mx-auto">
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-semibold text-foreground mt-1">{c.name}</p>
                <p className="text-[8px] text-muted-foreground">{c.specialty}</p>
              </motion.div>
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{userCredits.toLocaleString()}원</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Best Reviews */}
      {reviews.length > 0 && (
        <section className="px-4 pb-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-serif text-lg font-bold text-secondary-foreground mb-3 px-1">⭐ 베스트 후기</h2>
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
          </div>
        </section>
      )}

      {/* Menu Cards by Category */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          {categories.map(cat => {
            const items = products.filter(p => p.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <h2 className="font-serif text-sm font-bold text-primary tracking-wider mb-3 px-1">
                  {categoryLabels[cat]}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {items.map(p => {
                    const counselor = getCounselorForMenu(p.menu_id);
                    return (
                      <motion.button
                        key={p.menu_id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onStartChat(p.menu_id)}
                        className={`glass-strong rounded-2xl p-3 text-left glow-border hover:shadow-lg transition-all ${p.is_snack ? 'border-2 border-dashed border-primary/30' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                            <img src={counselor.image} alt={counselor.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm">{p.icon}</span>
                              <h3 className="text-xs font-bold text-foreground truncate">{p.name}</h3>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-muted-foreground">{counselor.name}</span>
                              <span className="text-xs font-bold text-primary">{p.price.toLocaleString()}원</span>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
