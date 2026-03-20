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
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-12">불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="glass-strong rounded-2xl p-8 text-center glow-border">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">첫 후기를 남기고 적립금을 받아보세요! ✨</p>
          </div>
        ) : (
          reviews.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-strong rounded-2xl p-4 glow-border"
            >
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: r.rating || 5 }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-2">{r.content}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{r.masked_name}</span>
                <div className="flex items-center gap-2">
                  {r.menu_name && <span className="text-xs text-primary font-medium">{r.menu_name}</span>}
                  <span className="text-[10px] text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
