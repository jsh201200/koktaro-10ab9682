import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { COUNSELORS } from '@/data/counselors';
import { MENUS } from '@/data/menus';
import { Star, Gift, Sparkles, ChevronRight, X, Play } from 'lucide-react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

interface Review {
  id: string;
  masked_name: string;
  content: string;
  rating: number;
  menu_name: string | null;
  created_at: string;
}

interface OngoingConsult {
  counselor_id: string;
  counselor_name: string;
  room_id: string;
}

interface MenuWithPrice {
  id: number;
  name: string;
  icon: string;
  price: number;
  category: string;
  categoryName: string;
  specialty?: string;
}

interface LandingPageProps {
  onStartChat: (menuId?: number) => void;
  couponActive: boolean;
  userCredits: number;
  userName: string;
  onCheckCredits: () => void;
}

// 🌟 테스트 후기 3개 미리 삽입
const SAMPLE_REVIEWS = [
  {
    masked_name: '명화 선생님',
    content: '명화 선생님 팩폭에 정신 번쩍 들었어요. 이건 뭐 신(神)인가 싶을 정도로 정확했어요! 강력 추천합니다 🔥',
    rating: 5,
    menu_name: '손금 관상',
  },
  {
    masked_name: '루나 선생님',
    content: '루나 선생님 타로는 정말 귀신인줄 알았어요. 지금까지 받은 상담 중 가장 정확했고 앞으로 어떻게 해야 할지까지 알려주셨어요!',
    rating: 5,
    menu_name: '타로 카드',
  },
  {
    masked_name: '이안 선생님',
    content: '투자 조언은 이안 선생님이 최고라고 생각해요. 숫자와 데이터로 정확하게 설명해주셔서 신뢰가 가요 💼',
    rating: 5,
    menu_name: '재물운 분석',
  },
];

export default function LandingPage({ onStartChat, couponActive, userCredits, userName, onCheckCredits }: LandingPageProps) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ongoingConsults, setOngoingConsults] = useState<Map<string, OngoingConsult>>(new Map());
  const [menusWithPrices, setMenusWithPrices] = useState<MenuWithPrice[]>([]);
  const { config } = useSiteConfig();
  const [showPopup, setShowPopup] = useState(false);

  // ✨ 후기 로드 (없으면 샘플 후기 사용)
  useEffect(() => {
    const fetchData = async () => {
      const { data: revs, count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (revs && revs.length > 0) {
        setReviews(revs as any);
      } else {
        // 🌟 후기가 없으면 샘플 후기 표시
        const sampleReviews: Review[] = SAMPLE_REVIEWS.map((r, i) => ({
          id: `sample-${i}`,
          masked_name: r.masked_name,
          content: r.content,
          rating: r.rating,
          menu_name: r.menu_name,
          created_at: new Date().toISOString(),
        }));
        setReviews(sampleReviews);
      }
    };
    fetchData();
  }, []);

  // ✨ 메뉴 + 가격 실시간 로드 (DB에서!)
  useEffect(() => {
    const loadMenusWithPrices = async () => {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('enabled', true)
        .order('sort_order');

      if (products) {
        // MENUS와 products 합치기 (DB 가격으로 업데이트)
        const merged = MENUS.map(menu => {
          const product = products.find((p: any) => p.menu_id === menu.id);
          return {
            ...menu,
            name: product?.name || menu.name,
            price: product?.price || menu.price,
          };
        });
        setMenusWithPrices(merged);
      } else {
        // DB 없으면 기본 MENUS 사용
        setMenusWithPrices(MENUS.map(m => ({ ...m, price: m.price })));
      }
    };

    loadMenusWithPrices();

    // ✨ 실시간 구독 (DB 변경 시 자동 업데이트)
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadMenusWithPrices(); // DB 변경되면 다시 로드
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✨ 진행 중인 상담 로드
  useEffect(() => {
    const loadOngoingConsults = async () => {
      const sessionId = localStorage.getItem('howl_session_id');
      if (!sessionId) return;

      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id, room_id, selected_menu_id')
        .eq('id', sessionId)
        .single();

      if (sessions && sessions.room_id) {
        const roomParts = sessions.room_id.split('_');
        const counselorId = roomParts[1];
        const counselor = COUNSELORS.find(c => c.id === counselorId);

        if (counselor) {
          const consults = new Map();
          consults.set(counselorId, {
            counselor_id: counselorId,
            counselor_name: counselor.name,
            room_id: sessions.room_id,
          });
          setOngoingConsults(consults);
        }
      }
    };

    loadOngoingConsults();
  }, []);

  useEffect(() => {
    if (config.popup_notice && config.popup_notice.trim()) {
      setShowPopup(true);
    }
  }, [config.popup_notice]);

  const handleStartConsult = (counselorId: string) => {
    const counselor = COUNSELORS.find(c => c.id === counselorId);
    if (counselor && counselor.menuIds.length > 0) {
      const menuId = counselor.menuIds[0];
      onStartChat(menuId);
    }
  };

  const handleContinueConsult = (counselorId: string) => {
    const consult = ongoingConsults.get(counselorId);
    if (consult) {
      localStorage.setItem('continue_room_id', consult.room_id);
      onStartChat();
    }
  };

  return (
    <div className="min-h-svh aurora-bg">
      {couponActive && config.banner_text && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-50 bg-gradient-to-r from-primary to-glow-pink text-primary-foreground text-center py-2.5 px-4 text-xs font-semibold"
        >
          {config.banner_text}
        </motion.div>
      )}

      <AnimatePresence>
        {showPopup && config.popup_notice && config.popup_notice.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setShowPopup(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
            >
              <button onClick={() => setShowPopup(false)} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/40">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-3xl block mb-3 text-center">📢</span>
              <p className="text-sm text-foreground whitespace-pre-wrap text-center">{config.popup_notice}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative overflow-hidden px-4 pt-14 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-2">콕 타로</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-3 neon-glow">
              {config.hero_title}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              {config.hero_subtitle}
            </p>
          </motion.div>

          <div className="flex flex-col gap-2 mb-8 max-w-md mx-auto">
            {COUNSELORS.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                {ongoingConsults.has(c.id) && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartConsult(c.id)}
                    className="flex-1 flex items-center gap-3 p-3 rounded-xl glass-strong glow-border hover:bg-muted/40 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-1 ring-primary/20">
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.specialty}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleStartConsult(c.id)}
                    className="px-3 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all active:scale-[0.95] font-semibold text-xs whitespace-nowrap flex-shrink-0"
                    title={`${c.name}와 상담 시작`}
                  >
                    상담 시작
                  </motion.button>

                  {ongoingConsults.has(c.id) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleContinueConsult(c.id)}
                      className="px-3 py-3 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-all active:scale-[0.95] flex items-center gap-1.5 font-semibold text-xs whitespace-nowrap flex-shrink-0"
                      title="상담 이어하기"
                    >
                      <Play className="w-3 h-3 fill-primary" />
                      이어하기
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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

      <section className="px-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" /> 베스트 후기
            </h2>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-lg"
            >
              ✨
            </motion.div>
          </div>

          {reviews.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {reviews.slice(0, 3).map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate('/reviews')}
                  className="glass-strong rounded-2xl p-4 min-w-[240px] max-w-[280px] flex-shrink-0 glow-border cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Star className="w-4 h-4 fill-primary text-primary" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-foreground line-clamp-3 mb-2 font-medium">{r.content}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                    <span className="text-[11px] text-muted-foreground font-semibold">{r.masked_name}</span>
                    {r.menu_name && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-1 rounded">{r.menu_name}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-6 text-center glow-border">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl mb-2">
                ✨
              </motion.div>
              <p className="text-sm text-muted-foreground">첫 후기를 남기고 적립금을 받아보세요!</p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/reviews')}
            className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-pink-500/20 text-primary font-bold text-sm hover:shadow-lg transition-all border border-primary/30 flex items-center justify-center gap-2"
          >
            <span>✏️</span>
            <span>후기 작성하고 1,000원 받기</span>
          </motion.button>
        </div>
      </section>

      <footer className="px-4 pb-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            {config.footer_business_info}
          </p>
        </div>
      </footer>
    </div>
  );
}
