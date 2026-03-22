import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewModalProps {
  sessionId: string;
  profileId: string;
  userName: string;
  menuName: string;
  paymentPrice: number;
  onClose: () => void;
}

export default function ReviewModal({ sessionId, profileId, userName, menuName, paymentPrice, onClose }: ReviewModalProps) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // 🎁 자동 적립금 조건: 9,900원 이상 + 100자 이상
  const canEarnCredits = paymentPrice >= 9900 && content.length >= 100;

  const maskedName = userName.length >= 2
    ? userName[0] + '*'.repeat(userName.length - 1) + '님'
    : userName + '님';

  const handleSubmit = async () => {
    if (content.length < 10) {
      toast.error('후기를 10자 이상 작성해주세요');
      return;
    }
    setSubmitting(true);

    try {
      // 1️⃣ 후기 DB에 저장
      const { error: reviewError } = await supabase.from('reviews').insert({
        session_id: sessionId,
        profile_id: profileId,
        user_nickname: userName,
        masked_name: maskedName,
        content,
        rating,
        menu_name: menuName,
        credits_awarded: canEarnCredits, // 자동 적립금 지급 여부 기록
      });

      if (reviewError) {
        toast.error('후기 등록에 실패했어요');
        setSubmitting(false);
        return;
      }

      // 2️⃣ 조건 충족 시 자동으로 1,000원 적립금 지급
      if (canEarnCredits) {
        // user_profiles에서 현재 credits 조회
        const { data: profile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', profileId)
          .single();

        if (fetchError) {
          toast.error('사용자 정보를 불러올 수 없어요');
          setSubmitting(false);
          return;
        }

        // credits에 1,000원 추가
        const newCredits = (profile?.credits || 0) + 1000;
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ credits: newCredits })
          .eq('id', profileId);

        if (updateError) {
          toast.error('적립금 지급에 실패했어요');
          setSubmitting(false);
          return;
        }

        toast.success('후기 작성 완료! 1,000원 적립금이 지급되었어요 🎉', {
          description: `현재 적립금: ${newCredits.toLocaleString()}원`,
        });
      } else {
        toast.success('후기가 등록되었어요! 관리자 승인 후 노출됩니다 ✨', {
          description: canEarnCredits ? '' : paymentPrice >= 9900 ? `${100 - content.length}자 더 작성하면 1,000원!` : '9,900원 이상 상품에서만 적립금을 받을 수 있어요',
        });
      }

      onClose();
    } catch (error) {
      console.error('후기 등록 오류:', error);
      toast.error('오류가 발생했어요. 다시 시도해주세요');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-4">
          <span className="text-2xl mb-1 block">⭐</span>
          <h3 className="font-serif text-lg font-bold text-secondary-foreground">상담 후기 작성</h3>
          <p className="text-xs text-muted-foreground mt-1">{menuName} 상담</p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className={`w-6 h-6 ${s <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={4}
          placeholder="상담 후기를 작성해주세요..."
        />

        <div className="flex justify-between items-center mt-2 mb-4">
          <span className="text-[10px] text-muted-foreground">{content.length}자</span>
          
          {/* 🎁 자동 적립금 조건 표시 */}
          {paymentPrice >= 9900 ? (
            <span className={`text-[10px] font-medium transition-colors ${
              canEarnCredits ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {canEarnCredits 
                ? '🎉 1,000원 적립금 지급!' 
                : `100자 이상 작성 시 적립금 지급 (${100 - content.length}자 남음)`
              }
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              9,900원 이상 상품에서만 적립금 지급
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={content.length < 10 || submitting}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '후기 등록하기'}
        </button>

        <p className="text-[9px] text-muted-foreground text-center mt-3">
          후기는 마스킹 처리({maskedName}) 후 메인에 노출됩니다
        </p>

        {/* 🎁 적립금 조건 안내 */}
        {paymentPrice >= 9900 && (
          <div className="mt-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-[9px] text-primary text-center font-medium">
              💝 100자 이상 후기 작성 시 자동으로 1,000원이 적립됩니다!
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
