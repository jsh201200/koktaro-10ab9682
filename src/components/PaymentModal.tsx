import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu } from '@/data/menus';
import { X } from 'lucide-react';
import { loadSettings } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';

interface PaymentModalProps {
  menu: Menu;
  userName: string;
  onClose: () => void;
  onPaymentSubmit: (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => void;
  couponActive?: boolean;
  couponCode?: string;
  couponDiscount?: number;
  userCredits?: number;
}

interface MenuWithPrice extends Menu {
  price: number;
}

export default function PaymentModal({ 
  menu, 
  userName, 
  onClose, 
  onPaymentSubmit, 
  couponActive, 
  couponCode,
  couponDiscount = 0,
  userCredits = 0 
}: PaymentModalProps) {
  const [step, setStep] = useState<'select' | 'bank'>('select');
  const [depositor, setDepositor] = useState(userName);
  const [phoneTail, setPhoneTail] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'coupon' | 'credits'>('none');
  const [menuWithPrice, setMenuWithPrice] = useState<MenuWithPrice>(menu as MenuWithPrice);
  const s = loadSettings();

  // ✨ DB에서 실시간 가격 fetch
  useEffect(() => {
    const loadMenuPrice = async () => {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('menu_id', menu.id)
        .single();

      if (product) {
        setMenuWithPrice({
          ...menu,
          price: product.price,
          name: product.name || menu.name,
        } as MenuWithPrice);
      }
    };

    loadMenuPrice();

    // ✨ 실시간 구독 (가격 변경 시 자동 업데이트)
    const channel = supabase
      .channel(`product-${menu.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `menu_id=eq.${menu.id}`
        },
        () => {
          loadMenuPrice(); // 가격 변경되면 다시 로드
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [menu.id, menu]);

  // 🎟️ 쿠폰 사용 가능 여부 (9,900원 이상만)
  const canUseCoupon = couponActive && couponCode && menuWithPrice.price >= 9900;
  const canUseCredits = userCredits > 0 && menuWithPrice.price >= 9900;

  let finalPrice = menuWithPrice.price;
  let discountAmount = 0;

  if (discountType === 'coupon' && canUseCoupon) {
    discountAmount = couponDiscount;
    finalPrice = Math.max(0, menuWithPrice.price - discountAmount);
  } else if (discountType === 'credits' && canUseCredits) {
    discountAmount = Math.min(userCredits, menuWithPrice.price);
    finalPrice = menuWithPrice.price - discountAmount;
  }

  const handleKakaoPay = () => {
    window.open(s.kakaoPayLink, '_blank');
    onPaymentSubmit('kakaopay', depositor || userName, phoneTail);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="text-center mb-5">
            <span className="text-3xl mb-2 block">{menuWithPrice.icon}</span>
            <h3 className="font-display text-lg font-bold text-foreground">{menuWithPrice.name}</h3>
            
            {/* 🎟️ 쿠폰 배너 */}
            {canUseCoupon && (
              <div className="mt-2 px-2 py-1 rounded-lg bg-primary/20 border border-primary/30">
                <p className="text-xs text-primary font-semibold">
                  🎟️ 쿠폰 '{couponCode}' 사용 가능!
                </p>
              </div>
            )}

            <p className="text-2xl font-bold text-primary mt-3">
              {finalPrice.toLocaleString()}원
              {discountAmount > 0 && (
                <span className="text-sm text-muted-foreground line-through ml-2">{menuWithPrice.price.toLocaleString()}원</span>
              )}
            </p>

            {/* 할인 정보 표시 */}
            {discountAmount > 0 && (
              <p className="text-xs text-green-500 mt-1">
                ✅ {discountAmount.toLocaleString()}원 할인 적용됨
              </p>
            )}
          </div>

          {/* Discount options */}
          {(canUseCoupon || canUseCredits) && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">💝 할인 혜택 (택 1)</p>
              
              {canUseCoupon && (
                <label className={`flex items-center gap-2 p-2.5 rounded-xl glass cursor-pointer transition-all ${discountType === 'coupon' ? 'ring-2 ring-primary' : ''}`}>
                  <input
                    type="radio"
                    name="discount"
                    checked={discountType === 'coupon'}
                    onChange={() => setDiscountType('coupon')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      🎟️ 쿠폰 '{couponCode}' - {couponDiscount.toLocaleString()}원 할인
                    </p>
                    <p className="text-[10px] text-muted-foreground">자동 적용</p>
                  </div>
                </label>
              )}

              {canUseCredits && (
                <label className={`flex items-center gap-2 p-2.5 rounded-xl glass cursor-pointer transition-all ${discountType === 'credits' ? 'ring-2 ring-primary' : ''}`}>
                  <input
                    type="radio"
                    name="discount"
                    checked={discountType === 'credits'}
                    onChange={() => setDiscountType('credits')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">적립금 사용</p>
                    <p className="text-[10px] text-muted-foreground">보유: {userCredits.toLocaleString()}원</p>
                  </div>
                </label>
              )}

              <label className={`flex items-center gap-2 p-2.5 rounded-xl glass cursor-pointer transition-all ${discountType === 'none' ? 'ring-2 ring-primary' : ''}`}>
                <input
                  type="radio"
                  name="discount"
                  checked={discountType === 'none'}
                  onChange={() => setDiscountType('none')}
                  className="accent-primary"
                />
                <p className="text-xs text-muted-foreground">할인 없이 결제</p>
              </label>
            </div>
          )}

          {step === 'select' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">입금자명</label>
                <input
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="입금자명 입력"
                />
                <p className="text-[10px] text-destructive">⚠️ 입금자명이 다르면 확인이 늦어질 수 있어!</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">전화번호 뒷자리 (4자리)</label>
                <input
                  value={phoneTail}
                  onChange={(e) => setPhoneTail(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full p-2.5 rounded-xl glass text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="0000"
                  maxLength={4}
                />
              </div>

              <button
                onClick={handleKakaoPay}
                className="w-full py-3 rounded-2xl bg-[#FEE500] text-[#3C1E1E] font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                카카오페이로 결제하기 ({finalPrice.toLocaleString()}원)
              </button>
              <button
                onClick={() => setStep('bank')}
                className="w-full py-3 rounded-2xl glass text-foreground font-semibold text-sm hover:bg-muted/70 transition-all active:scale-[0.98]"
              >
                무통장 입금
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">은행</span>
                  <span className="font-semibold text-foreground">{s.bankName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">계좌번호</span>
                  <span className="font-semibold text-foreground font-mono">{s.bankAccount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">예금주</span>
                  <span className="font-semibold text-foreground">{s.bankHolder}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">금액</span>
                  <span className="font-bold text-primary">{finalPrice.toLocaleString()}원</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-green-500 font-semibold">할인 적용</span>
                    <span className="text-green-500 font-semibold">-{discountAmount.toLocaleString()}원</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => onPaymentSubmit('bank', depositor || userName, phoneTail)}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                입금 완료 확인 요청
              </button>
              <button
                onClick={() => setStep('select')}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← 결제 방식 다시 선택
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
              {s.refundPolicy}
            </p>
            <p className="text-[8px] text-muted-foreground/60 text-center mt-1">
              본 서비스는 데이터 분석 기반 에듀테인먼트 콘텐츠입니다.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
