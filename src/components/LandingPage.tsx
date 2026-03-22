import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { COUNSELORS } from '@/data/counselors';
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

interface LandingPageProps {
  onStartChat: (menuId?: number) => void;
  couponActive: boolean;
  userCredits: number;
  userName: string;
  onCheckCredits: () => void;
}

export default function LandingPage({ onStartChat, couponActive, userCredits, userName, onCheckCredits }: LandingPageProps) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ongoingConsults, setOngoingConsults] = useState<Map<string, OngoingConsult>>(new Map());
  const { config } = useSiteConfig();
  const [showPopup, setShowPopup] = useState(false);

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
        // room_id에서 counselor_id 추출 (room_ian_1234567 -> ian)
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

  // Show popup notice if configured
  useEffect(() => {
    if (config.popup_notice && config.popup_notice.trim()) {
      setShowPopup(true);
    }
  }, [config.popup_notice]);

  // ✨ 상담 이어하기
  const handleContinueConsult = (counselorId: string) => {
    const consult = ongoingConsults.get(counselorId);
    if (consult) {
      localStorage.setItem('continue_room_id', consult.room_id);
      onStartChat();
    }
  };

  return (
    <div className="min-h-svh aurora-bg">
      {/* Coupon Banner - DB driven */}
      {couponActive && config.banner_text && (
        <motion.div
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-50 bg-gradient-to-r from-primary to-glow-pink text-primary-foreground text-center py-2.5 px-4 text-xs font-semibold"
        >
          {config.banner_text}
        </motion.div>
      )}

      {/* Popup Notice */}
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

      {/* Hero Banner - DB driven */}
      <section className="relative overflow-hidden px-4 pt-14 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-2">KOK TAROT</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-3 neon-glow">
              {config.hero_title}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              {config.hero_subtitle}
            </p>
          </motion.div>

          {/* Counselor List - Slim KakaoTalk Style */}
          <div className="flex flex-col gap-2 mb-8 max-w-md mx-auto">
            {COUNSELORS.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                {/* ✨ 진행 중인 상담 배지 */}
                {ongoingConsults.has(c.id) && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onStartChat()}
                    className="flex-1 flex items-center gap-3 p-3 rounded-xl glass-strong glow-border hover:bg-muted/40 transition-all active:scale-[0.98] group"
                  >
                    {/* Profile Image */}
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-1 ring-primary/20">
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.specialty}</p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>

                  {/* ✨ 상담 이어하기 버튼 */}
                  {ongoingConsults.has(c.id) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleContinueConsult(c.id)}
                      className="px-3 py-3 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-all active:scale-[0.95] flex items-center gap-1.5 font-semibold text-xs"
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

      {/* Best Reviews - clickable to /reviews */}
      <section className="px-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/reviews')}
            className="w-full flex items-center justify-between mb-3 px-1 group"
          >
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> 베스트 후기
            </h2>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          {reviews.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {reviews.map(r => (
                <div
                  key={r.id}
                  onClick={() => navigate('/reviews')}
                  className="glass-strong rounded-2xl p-4 min-w-[240px] max-w-[280px] flex-shrink-0 glow-border cursor-pointer hover:shadow-lg transition-all"
                >
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

          {/* Write review CTA */}
          <button
            onClick={() => navigate('/reviews')}
            className="w-full mt-3 py-2.5 rounded-2xl glass text-xs font-semibold text-primary hover:bg-muted/40 transition-colors"
          >
            ✏️ 후기 작성하고 1,000원 받기
          </button>
        </div>
      </section>

      {/* Footer - DB driven */}
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
