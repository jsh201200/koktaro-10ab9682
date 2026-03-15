import { motion } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';

interface PremiumFormProps {
  userName: string;
  onSubmit: (questions: string[], depositor: string, phoneTail: string) => void;
  onClose: () => void;
}

export default function PremiumForm({ userName, onSubmit, onClose }: PremiumFormProps) {
  const [questions, setQuestions] = useState(['', '', '', '', '']);
  const [depositor, setDepositor] = useState(userName);
  const [phoneTail, setPhoneTail] = useState('');

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const filledQuestions = questions.filter(q => q.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative glass-strong rounded-3xl p-6 max-w-md w-full shadow-2xl glow-border max-h-[85vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-5">
          <span className="text-3xl mb-2 block">💎</span>
          <h3 className="font-serif text-lg font-bold text-secondary-foreground">종합운명분석</h3>
          <p className="text-sm text-muted-foreground mt-1">하울에게 직접 물어보세요</p>
          <p className="text-xl font-bold text-primary mt-2">59,000원</p>
        </div>

        <div className="space-y-3 mb-4">
          {questions.map((q, i) => (
            <div key={i}>
              <label className="text-xs text-muted-foreground font-medium">질문 {i + 1} {i < 3 ? '' : '(선택)'}</label>
              <textarea
                value={q}
                onChange={(e) => updateQuestion(i, e.target.value)}
                className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                placeholder={`질문을 입력해주세요...`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium">입금자명</label>
            <input
              value={depositor}
              onChange={(e) => setDepositor(e.target.value)}
              className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">전화번호 뒷자리</label>
            <input
              value={phoneTail}
              onChange={(e) => setPhoneTail(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="0000"
              maxLength={4}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (filledQuestions.length > 0) {
              onSubmit(filledQuestions, depositor, phoneTail);
            }
          }}
          disabled={filledQuestions.length === 0}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          상담 신청하기 (59,000원)
        </button>

        <p className="text-[9px] text-muted-foreground text-center mt-3">
          디지털 콘텐츠 특성상 리딩 시작 후 환불이 불가합니다.
        </p>
      </motion.div>
    </motion.div>
  );
}
