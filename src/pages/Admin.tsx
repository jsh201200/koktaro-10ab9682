import { useState } from 'react';
import { motion } from 'framer-motion';
import { loadSettings } from '@/stores/siteSettings';

interface PendingPayment {
  id: string;
  userName: string;
  menuName: string;
  menuId: number;
  price: number;
  method: string;
  depositor: string;
  phoneTail: string;
  timestamp: number;
  approved: boolean;
  chatLog: string[];
  questions?: string[];
}

// In-memory store (shared with main app via window)
declare global {
  interface Window {
    __howl_payments?: PendingPayment[];
    __howl_approve?: (paymentId: string) => void;
  }
}

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [reportText, setReportText] = useState<Record<string, string>>({});

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '9304';

  const payments: PendingPayment[] = window.__howl_payments || [];

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    if (val === ADMIN_PASSWORD) {
      setIsAuthorized(true);
    }
  };

  const handleApprove = (paymentId: string) => {
    if (window.__howl_approve) {
      window.__howl_approve(paymentId);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border"
        >
          <span className="text-4xl mb-4 block">🔮</span>
          <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-4">관리자 인증</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordCheck(e.target.value)}
            className="w-full p-3 rounded-2xl glass text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="비밀번호 입력"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-3">관리자 비밀번호를 입력하세요</p>
        </motion.div>
      </div>
    );
  }

  const pending = payments.filter(p => !p.approved);
  const approved = payments.filter(p => p.approved);

  return (
    <div className="min-h-svh aurora-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-secondary-foreground">🔮 관리자 대시보드</h2>
            <p className="text-sm text-muted-foreground mt-1">하울의 상담소 관리</p>
          </div>
          <a
            href="/"
            className="glass rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-white/60 transition-colors"
          >
            상담소로 이동
          </a>
        </div>

        {/* Pending */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-primary tracking-wider uppercase mb-4">
            ⏳ 입금 대기 ({pending.length})
          </h3>
          {pending.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-muted-foreground text-sm">
              대기 중인 결제가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((pay) => (
                <motion.div
                  key={pay.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-2xl p-4 glow-border"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <p className="font-bold text-foreground">
                        {pay.userName} — {pay.menuId}번 {pay.menuName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        입금자: {pay.depositor} / {pay.price.toLocaleString()}원 / 📱 {pay.phoneTail || '미입력'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pay.method === 'kakaopay' ? '카카오페이' : pay.method === 'bank' ? '무통장' : '프리미엄'} ·{' '}
                        {new Date(pay.timestamp).toLocaleString('ko-KR')}
                      </p>
                      {pay.questions && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p className="font-medium">질문:</p>
                          {pay.questions.map((q, i) => (
                            <p key={i}>{i + 1}. {q}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <details className="relative">
                        <summary className="px-3 py-1.5 glass rounded-xl text-xs cursor-pointer hover:bg-white/60 transition-colors">
                          로그 보기
                        </summary>
                        <div className="absolute right-0 mt-2 w-72 max-h-60 overflow-y-auto glass-strong rounded-xl p-3 shadow-lg z-10 text-xs space-y-1">
                          {pay.chatLog.length > 0 ? (
                            pay.chatLog.map((log, i) => (
                              <p key={i} className="text-muted-foreground">{log}</p>
                            ))
                          ) : (
                            <p className="text-muted-foreground">로그 없음</p>
                          )}
                        </div>
                      </details>
                      <button
                        onClick={() => handleApprove(pay.id)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95"
                      >
                        승인
                      </button>
                    </div>
                  </div>

                  {/* Premium report area */}
                  {pay.menuId === 16 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <label className="text-xs text-muted-foreground font-medium">리포트 작성</label>
                      <textarea
                        value={reportText[pay.id] || ''}
                        onChange={(e) => setReportText(prev => ({ ...prev, [pay.id]: e.target.value }))}
                        className="w-full mt-1 p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        rows={4}
                        placeholder="하울의 심층 리포트를 작성하세요..."
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Approved */}
        {approved.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground tracking-wider uppercase mb-4">
              ✅ 승인 완료 ({approved.length})
            </h3>
            <div className="space-y-2">
              {approved.map((pay) => (
                <div key={pay.id} className="glass rounded-2xl p-3 opacity-70">
                  <p className="text-sm text-foreground">
                    {pay.userName} — {pay.menuName} — {pay.price.toLocaleString()}원
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
