import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { loadSettings } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Edit2, Star, X, Settings, Ticket, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

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
  discount_amount?: number;
  final_price?: number;
}

interface Review {
  id: string;
  masked_name: string;
  content: string;
  rating: number;
  menu_name: string | null;
  is_approved: boolean;
  created_at: string;
}

interface Stats {
  totalRevenue: number;
  pendingCount: number;
  totalReviews: number;
  approvedReviews: number;
}

interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  credits: number;
  created_at: string;
  pin?: string;
}

interface CouponData {
  couponCode: string;
  couponDiscount: number;
  couponActive: boolean;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'users' | 'coupons'>('dashboard');
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    pendingCount: 0,
    totalReviews: 0,
    approvedReviews: 0,
  });

  // 📊 매출 통계 관련
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statsRevenue, setStatsRevenue] = useState(0);
  const [statsApprovedCount, setStatsApprovedCount] = useState(0);

  // 후기 관리 (페이지네이션)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsPerPage] = useState(10);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);

  // 고객 관리 (폰번호, PIN 포함)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [showPinFor, setShowPinFor] = useState<string | null>(null);

  const [coupon, setCoupon] = useState<CouponData>({
    couponCode: '',
    couponDiscount: 0,
    couponActive: false,
  });
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');

  const [loading, setLoading] = useState(false);

  const ADMIN_PASSWORD = loadSettings().adminPassword;

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    if (val === ADMIN_PASSWORD) {
      setIsAuthorized(true);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    let startDate = new Date();
    
    if (statsPeriod === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (statsPeriod === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (statsPeriod === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (statsPeriod === 'custom' && customStartDate) {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
    }

    let endDate = new Date();
    if (statsPeriod === 'custom' && customEndDate) {
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }

    const { data: statsData } = await supabase
      .from('payments')
      .select('final_price, price')
      .eq('status', 'approved')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const revenue = statsData?.reduce((sum, p) => sum + (p.final_price || p.price || 0), 0) || 0;
    const count = statsData?.length || 0;

    setStatsRevenue(revenue);
    setStatsApprovedCount(count);

    const { data: allReviews } = await supabase
      .from('reviews')
      .select('*');

    const approvedReviews = allReviews?.filter(r => r.is_approved).length || 0;

    setStats({
      totalRevenue: revenue,
      pendingCount: payments.filter(p => p.status === 'pending').length,
      totalReviews: allReviews?.length || 0,
      approvedReviews,
    });
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
  };

  const fetchCoupon = async () => {
    setCouponLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'coupon')
      .single();

    if (data && data.value) {
      setCoupon(data.value as CouponData);
      setCouponCode(data.value.couponCode || '');
      setCouponDiscount(String(data.value.couponDiscount || ''));
    }
    setCouponLoading(false);
  };

  const handleSaveCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력하세요');
      return;
    }

    if (!couponDiscount || isNaN(Number(couponDiscount))) {
      toast.error('유효한 할인 금액을 입력하세요');
      return;
    }

    setCouponLoading(true);

    const newCouponData: CouponData = {
      couponCode: couponCode.trim(),
      couponDiscount: Number(couponDiscount),
      couponActive: coupon.couponActive,
    };

    const { error } = await supabase
      .from('site_settings')
      .update({ value: newCouponData })
      .eq('key', 'coupon');

    if (error) {
      toast.error('쿠폰 저장 실패');
    } else {
      toast.success('쿠폰이 저장되었습니다!');
      setCoupon(newCouponData);
    }

    setCouponLoading(false);
  };

  const handleToggleCoupon = async () => {
    setCouponLoading(true);

    const newCouponData: CouponData = {
      ...coupon,
      couponActive: !coupon.couponActive,
    };

    const { error } = await supabase
      .from('site_settings')
      .update({ value: newCouponData })
      .eq('key', 'coupon');

    if (error) {
      toast.error('쿠폰 상태 변경 실패');
    } else {
      toast.success(newCouponData.couponActive ? '쿠폰이 활성화되었습니다' : '쿠폰이 비활성화되었습니다');
      setCoupon(newCouponData);
    }

    setCouponLoading(false);
  };

  // 매출 통계 리셋 (테스트용 결제 삭제)
  const handleResetStats = async () => {
    if (!confirm('정말 모든 매출 기록을 삭제하시겠습니까? (복구 불가)')) return;

    setLoading(true);
    const { error } = await supabase
      .from('payments')
      .delete()
      .not('id', 'is', null);

    if (error) {
      toast.error('삭제 실패');
    } else {
      toast.success('모든 매출 기록이 삭제되었습니다');
      fetchPayments();
      fetchStats();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchPayments();
      fetchReviews();
      fetchUsers();
      fetchCoupon();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (payments.length >= 0) {
      fetchStats();
    }
  }, [payments, statsPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    if (!isAuthorized) return;
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchPayments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => fetchReviews())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => fetchCoupon())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthorized]);

  const handleApprovePayment = async (paymentId: string) => {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      toast.error('승인 실패');
    } else {
      toast.success('결제가 승인되었습니다!');
      fetchPayments();
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) {
        toast.error('삭제 실패');
      } else {
        toast.success('삭제되었습니다');
        fetchPayments();
      }
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: true })
      .eq('id', reviewId);

    if (!error) {
      toast.success('후기가 승인되었습니다');
      fetchReviews();
    }
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;

    const { error } = await supabase
      .from('reviews')
      .update({ content: editContent, rating: editRating })
      .eq('id', editingReview.id);

    if (error) {
      toast.error('수정 실패');
    } else {
      toast.success('후기가 수정되었습니다');
      setEditingReview(null);
      fetchReviews();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (!error) {
        toast.success('후기가 삭제되었습니다');
        fetchReviews();
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (!error) {
        toast.success('사용자가 삭제되었습니다');
        fetchUsers();
      }
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
  const pendingReviews = reviews.filter(r => !r.is_approved);
  const approvedReviews = reviews.filter(r => r.is_approved);

  // 페이지네이션
  const totalReviewPages = Math.ceil(reviews.length / reviewsPerPage);
  const startIdx = (reviewPage - 1) * reviewsPerPage;
  const paginatedReviews = reviews.slice(startIdx, startIdx + reviewsPerPage);

  const filteredUsers = users.filter(u => u.nickname.includes(searchUser) || u.phone.includes(searchUser));

  return (
    <div className="min-h-svh aurora-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">🔮 관리자 대시보드</h2>
            <p className="text-sm text-muted-foreground mt-1">콕타로 상담소 관리</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchPayments();
                fetchReviews();
                fetchUsers();
                fetchCoupon();
              }}
              disabled={loading}
              className="glass rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-white/60 transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
            </button>
            <button
              onClick={() => navigate('/')}
              className="glass rounded-2xl px-4 py-2 text-sm font-medium text-primary hover:bg-white/60 transition-colors"
            >
              상담소로
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
          {['dashboard', 'reviews', 'users', 'coupons'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'dashboard' && '📊 대시보드'}
              {tab === 'reviews' && '⭐ 후기'}
              {tab === 'users' && '👥 사용자'}
              {tab === 'coupons' && '🎟️ 쿠폰'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div>
            {/* 📊 매출 통계 필터 */}
            <div className="glass-strong rounded-2xl p-4 glow-border mb-6">
              <h3 className="text-sm font-bold text-primary mb-3">📈 매출 통계 기간 선택</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {['today', 'week', 'month', 'custom'].map(period => (
                  <button
                    key={period}
                    onClick={() => setStatsPeriod(period as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      statsPeriod === period
                        ? 'bg-primary text-primary-foreground'
                        : 'glass hover:bg-white/40'
                    }`}
                  >
                    {period === 'today' && '오늘'}
                    {period === 'week' && '이번 주'}
                    {period === 'month' && '이번 달'}
                    {period === 'custom' && '직접 선택'}
                  </button>
                ))}
              </div>

              {statsPeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="flex-1 p-2 rounded-xl glass text-xs"
                  />
                  <span className="text-xs text-muted-foreground flex items-center">~</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex-1 p-2 rounded-xl glass text-xs"
                  />
                </div>
              )}

              <button
                onClick={handleResetStats}
                className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-xl text-xs font-medium hover:bg-destructive/30 transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 모든 매출 삭제 (테스트용)
              </button>
            </div>

            {/* 📊 매출 통계 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <div className="glass-strong rounded-2xl p-4 text-center glow-border">
                <p className="text-2xl font-bold text-primary">{statsRevenue.toLocaleString()}원</p>
                <p className="text-xs text-muted-foreground">기간별 수익</p>
              </div>
              <div className="glass-strong rounded-2xl p-4 text-center glow-border">
                <p className="text-2xl font-bold text-primary">{statsApprovedCount}</p>
                <p className="text-xs text-muted-foreground">승인 건수</p>
              </div>
              <div className="glass-strong rounded-2xl p-4 text-center glow-border">
                <p className="text-2xl font-bold text-destructive">{stats.pendingCount}</p>
                <p className="text-xs text-muted-foreground">대기 중</p>
              </div>
            </div>

            {/* ⏳ 입금 대기 */}
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
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-foreground">
                            {pay.user_nickname} — {pay.menu_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(pay.final_price || pay.price).toLocaleString()}원 · {pay.method === 'bank' ? '무통장' : '카카오페이'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            입금자: {pay.depositor || '미입력'} · {pay.created_at ? new Date(pay.created_at).toLocaleDateString('ko-KR') : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprovePayment(pay.id)}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleDeletePayment(pay.id)}
                            className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-xl text-xs hover:bg-destructive/30 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {approved.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground tracking-wider uppercase mb-4">
                  ✅ 승인 완료 ({approved.length})
                </h3>
                <div className="space-y-2">
                  {approved.slice(0, 10).map((pay) => (
                    <div key={pay.id} className="glass rounded-2xl p-3 opacity-70">
                      <p className="text-sm text-foreground">
                        {pay.user_nickname} — {pay.menu_name} — {(pay.final_price || pay.price).toLocaleString()}원
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {pendingReviews.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-primary tracking-wider uppercase mb-4">
                  ⏳ 승인 대기 ({pendingReviews.length})
                </h3>
                <div className="space-y-3">
                  {pendingReviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-strong rounded-2xl p-4 glow-border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{review.menu_name}</p>
                      </div>
                      <p className="text-sm text-foreground mb-2">{review.content}</p>
                      <p className="text-xs text-muted-foreground mb-3">{review.masked_name}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveReview(review.id)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => {
                            setEditingReview(review);
                            setEditContent(review.content);
                            setEditRating(review.rating);
                          }}
                          className="px-3 py-1.5 glass rounded-xl text-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-xl text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {approvedReviews.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground tracking-wider uppercase mb-4">
                  ✅ 승인 완료 ({approvedReviews.length})
                </h3>

                {/* 📄 모든 후기 표시 (페이지네이션) */}
                <div className="space-y-2 mb-4">
                  {paginatedReviews.map((review) => (
                    <div key={review.id} className="glass rounded-2xl p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{review.content.substring(0, 60)}...</p>
                          <p className="text-xs text-muted-foreground">{review.masked_name}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-destructive hover:bg-destructive/20 p-1 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 페이지네이션 */}
                {totalReviewPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setReviewPage(Math.max(1, reviewPage - 1))}
                      disabled={reviewPage === 1}
                      className="p-1 rounded-lg glass disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {reviewPage} / {totalReviewPages}
                    </span>
                    <button
                      onClick={() => setReviewPage(Math.min(totalReviewPages, reviewPage + 1))}
                      disabled={reviewPage === totalReviewPages}
                      className="p-1 rounded-lg glass disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="사용자 검색 (이름/전화)"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full p-2 rounded-xl glass text-sm"
              />
            </div>
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="glass-strong rounded-2xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user.nickname}</p>
                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                    <div className="flex gap-2 mt-1">
                      <p className="text-xs text-primary">적립금: {user.credits.toLocaleString()}원</p>
                      <button
                        onClick={() => setShowPinFor(showPinFor === user.id ? null : user.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        {showPinFor === user.id ? '비번 숨기기' : '비번 보기'}
                      </button>
                      {showPinFor === user.id && (
                        <p className="text-xs font-bold bg-primary/20 px-2 py-0.5 rounded text-primary">
                          PIN: {user.pin || '없음'}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-destructive hover:bg-destructive/20 p-2 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-6 glow-border"
            >
              <div className="flex items-center gap-2 mb-6">
                <Ticket className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">쿠폰 관리</h3>
              </div>

              <div className="space-y-4">
                <div className="glass rounded-2xl p-4 mb-6">
                  <p className="text-xs text-muted-foreground mb-2">현재 쿠폰</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {coupon.couponCode || '설정된 쿠폰 없음'}
                      </p>
                      {coupon.couponCode && (
                        <p className="text-xs text-primary mt-1">
                          할인: {coupon.couponDiscount.toLocaleString()}원
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleToggleCoupon}
                      disabled={couponLoading || !coupon.couponCode}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        coupon.couponActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      } disabled:opacity-50`}
                    >
                      {coupon.couponActive ? '활성 🔓' : '비활성 🔒'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">
                    쿠폰 코드
                  </label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="예: LUCKY2025"
                    className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">
                    할인 금액 (원)
                  </label>
                  <input
                    type="number"
                    value={couponDiscount}
                    onChange={(e) => setCouponDiscount(e.target.value)}
                    placeholder="5000"
                    className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    min="0"
                  />
                </div>

                <button
                  onClick={handleSaveCoupon}
                  disabled={couponLoading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {couponLoading ? '저장 중...' : '쿠폰 저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {editingReview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingReview(null)} />
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="relative glass-strong rounded-3xl p-6 max-w-sm w-full glow-border"
              >
                <button
                  onClick={() => setEditingReview(null)}
                  className="absolute top-4 right-4"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg mb-4">후기 수정</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">별점</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          onClick={() => setEditRating(i)}
                          className={`p-1 ${editRating >= i ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          <Star className="w-5 h-5" fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 rounded-xl glass text-sm"
                    rows={4}
                  />
                  <button
                    onClick={handleUpdateReview}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-bold"
                  >
                    저장
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => navigate('/admin/settings')}
          className="fixed bottom-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"
          title="상세 설정"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
