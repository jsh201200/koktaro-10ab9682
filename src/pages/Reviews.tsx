import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  masked_name: string;
  content: string;
  rating: number;
  menu_name: string | null;
  created_at: string;
}

export default function Reviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (data) setReviews(data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-svh aurora-bg">
      <header className="sticky top-0 z-50 glass px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-muted/40 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">⭐ 베스트 후기</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 📋 약관 고지 */}
        <div className="glass-strong rounded-2xl p-4 glow-border border-l-4 border-primary mb-6">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            💡 <span className="font-semibold text-foreground">본 서비스는 데이터 분석 기반 에듀테인먼트 콘텐츠</span>입니다. 상담 결과는 자기 탐색을 위한 참고 자료일 뿐, 법적 책임을 보장하지 않습니다.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-12">불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="glass-strong rounded-2xl p-8 text-center glow-border">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl mb-3">
              ✨
            </motion.div>
            <p className="text-sm text-muted-foreground">첫 후기를 남기고 적립금을 받아보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-strong rounded-2xl p-4 glow-border hover:shadow-lg transition-all hover:scale-[1.01]"
              >
                {/* 별점 */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: r.rating || 5 }).map((_, j) => (
                    <motion.div
                      key={j}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: j * 0.05 }}
                    >
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    </motion.div>
                  ))}
                </div>

                {/* 후기 내용 */}
                <p className="text-sm text-foreground mb-3 leading-relaxed">{r.content}</p>

                {/* 하단 정보 */}
                <div className="flex justify-between items-center pt-3 border-t border-primary/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{r.masked_name}</span>
                    {r.menu_name && (
                      <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                        {r.menu_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 후기 작성 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
          className="w-full mt-8 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-pink-500/20 text-primary font-bold text-sm hover:shadow-lg transition-all border border-primary/30 flex items-center justify-center gap-2"
        >
          <span>✏️</span>
          <span>후기 작성하고 1,000원 받기</span>
        </motion.button>
      </main>

      <footer className="px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            콕타로는 당신의 운명을 읽어주는 AI 상담 플랫폼입니다.<br/>
            모든 상담은 전문 상담사의 노하우와 데이터 분석이 결합된 결과물입니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
