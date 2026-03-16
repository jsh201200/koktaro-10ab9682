import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Menu } from '@/data/menus';
import { X } from 'lucide-react';
import { loadSettings } from '@/stores/siteSettings';

interface PaymentModalProps {
  menu: Menu;
  userName: string;
  onClose: () => void;
  onPaymentSubmit: (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => void;
}

export default function PaymentModal({ menu, userName, onClose, onPaymentSubmit }: PaymentModalProps) {
  const [step, setStep] = useState<'select' | 'bank'>('select');
  const [depositor, setDepositor] = useState(userName);
  const [phoneTail, setPhoneTail] = useState('');
  const s = loadSettings();

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
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="text-center mb-5">
            <span className="text-3xl mb-2 block">{menu.icon}</span>
            <h3 className="font-serif text-lg font-bold text-secondary-foreground">{menu.name}</h3>
            <p className="text-2xl font-bold text-primary mt-1">{menu.price.toLocaleString()}원</p>
          </div>

          {step === 'select' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">입금자명</label>
                <input
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="입금자명 입력"
                />
                <p className="text-[10px] text-destructive">⚠️ 입금자명이 다르면 확인이 늦어질 수 있어!</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">전화번호 뒷자리 (4자리)</label>
                <input
                  value={phoneTail}
                  onChange={(e) => setPhoneTail(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="0000"
                  maxLength={4}
                />
              </div>

              <button
                onClick={handleKakaoPay}
                className="w-full py-3 rounded-2xl bg-[#FEE500] text-[#3C1E1E] font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                카카오페이로 결제하기
              </button>
              <button
                onClick={() => setStep('bank')}
                className="w-full py-3 rounded-2xl glass text-foreground font-semibold text-sm hover:bg-white/70 transition-all active:scale-[0.98]"
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
                  <span className="font-bold text-primary">{menu.price.toLocaleString()}원</span>
                </div>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
