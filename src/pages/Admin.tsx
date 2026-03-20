import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadSettings } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface Payment {
  id: string;
  user_nickname: string;
  menu_name: string;
  menu_id: number | null;
  price: number;
  method: string;
  depositor: string | null;
  phone_tail: string | null;
  status: string;
  created_at: string | null;
  chat_log: any;
  questions: any;
  session_id: string | null;
}

interface Stats {
  todayVisitors: number;
  totalRevenue: number;
  pendingCount: number;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ todayVisitors: 0, totalRevenue: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(false);

  const ADMIN_PASSWORD = loadSettings().adminPassword;

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    if (val === ADMIN_PASSWORD) {
      setIsAuthorized(true);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  // Fetch stats
  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: visitors } = await supabase
      .from('page_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { data: approvedPayments } = await supabase
      .from('payments')
      .select('price')
      .eq('status', 'approved');

    const totalRevenue = approvedPayments?.reduce((sum, p) => sum + p.price, 0) || 0;
    const pendingCount = payments.filter(p => p.status === 'pending').length;

    setStats({
      todayVisitors: visitors || 0,
      totalRevenue,
      pendingCount,
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchPayments();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (payments.length > 0) fetchStats();
  }, [payments]);

  // Realtime subscription for new payments
  useEffect(() => {
    if (!isAuthorized) return;
    const channel = supabase
      .channel('admin-payments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => { fetchPayments(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthorized]);

  const handleApprove = async (paymentId: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      toast.error('승인 실패: ' + error.message);
    } else {
      toast.success('결제가 승인되었습니다!');
      fetchPayments();
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

  const pending = payments.filter(p => p.status === 'pending');
  const approved = payments.filter(p => p.status === 'approved');

  return (
    <div className="min-h-svh aurora-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">🔮 관리자 대시보드</h2>
            <p className="text-sm text-muted-foreground mt-1">콕타로 상담소 관리</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPayments}
              disabled={loading}
              className="glass rounded-2xl px-3 py-2 text-sm font-medium text-primary hover:bg-white/60 transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
            </button>
            <a
              href="/"
              className="glass rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-white/60 transition-colors"
            >
              상담소로 이동
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-strong rounded-2xl p-4 text-center glow-border">
            <p className="text-2xl font-bold text-primary">{stats.todayVisitors}</p>
            <p className="text-xs text-muted-foreground">오늘 방문자</p>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center glow-border">
            <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toLocaleString()}원</p>
            <p className="text-xs text-muted-foreground">총 매출</p>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center glow-border">
            <p className="text-2xl font-bold text-primary">{stats.pendingCount}</p>
            <p className="text-xs text-muted-foreground">대기 중</p>
          </div>
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
                        {pay.user_nickname} — {pay.menu_id}번 {pay.menu_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        입금자: {pay.depositor || '미입력'} / {pay.price.toLocaleString()}원 / 📱 {pay.phone_tail || '미입력'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pay.method === 'kakaopay' ? '카카오페이' : pay.method === 'bank' ? '무통장' : '프리미엄'} ·{' '}
                        {pay.created_at ? new Date(pay.created_at).toLocaleString('ko-KR') : ''}
                      </p>
                      {pay.questions && Array.isArray(pay.questions) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p className="font-medium">질문:</p>
                          {(pay.questions as string[]).map((q: string, i: number) => (
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
                          {pay.chat_log && Array.isArray(pay.chat_log) ? (
                            (pay.chat_log as string[]).map((log: string, i: number) => (
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
                    {pay.user_nickname} — {pay.menu_name} — {pay.price.toLocaleString()}원
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pay.created_at ? new Date(pay.created_at).toLocaleString('ko-KR') : ''}
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
