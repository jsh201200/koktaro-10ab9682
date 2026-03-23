import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Trash2, Calendar, User, CreditCard, MessageSquare, Gift, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MENUS } from '@/data/menus';
import { COUNSELORS } from '@/data/counselors';

interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  credits: number;
  birth_date?: string;
  birth_time?: string;
  gender?: string;
  created_at?: string;
}

interface ChatSessionData {
  id: string;
  created_at: string;
  user_nickname: string;
  selected_menu_id: number;
  room_id: string;
}

interface ChatSessionDisplay extends ChatSessionData {
  selected_menu_name: string;
  counselor_name: string;
}

interface Payment {
  id: string;
  created_at: string;
  menu_name: string;
  method: string;
  price: number;
  final_price: number;
  discount_amount: number;
  discount_type: string;
  status: string;
}

interface Review {
  id: string;
  created_at: string;
  credits_awarded: number;
}

export default function MyPage() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionDisplay[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [birthData, setBirthData] = useState({
    birth_date: '',
    birth_time: '',
    gender: '',
  });

  useEffect(() => {
    const loadUserData = async () => {
      const profileId = localStorage.getItem('howl_profile_id');
      if (!profileId) {
        toast.error('로그인이 필요합니다');
        navigate('/');
        return;
      }

      setLoading(true);

      try {
        // 1️⃣ 프로필 정보
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (profile) {
          setUserProfile({
            id: profile.id,
            phone: profile.phone,
            nickname: profile.nickname || '',
            credits: profile.credits || 0,
            birth_date: profile.birth_date,
            birth_time: profile.birth_time,
            gender: profile.gender,
            created_at: profile.created_at,
          });
          setBirthData({
            birth_date: profile.birth_date || '',
            birth_time: profile.birth_time || '',
            gender: profile.gender || '',
          });

          // 2️⃣ 상담 내역 (3일 이내) - 정확한 컬럼만 선택
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
          const { data: sessions } = await supabase
            .from('chat_sessions')
            .select('id, created_at, user_nickname, selected_menu_id, room_id')
            .eq('profile_id', profileId)
            .gte('created_at', threeDaysAgo)
            .order('created_at', { ascending: false });

          if (sessions) {
            // 🔧 menu_id로 MENUS 배열에서 메뉴명 찾기 + 상담사명 찾기
            const displaySessions: ChatSessionDisplay[] = (sessions as ChatSessionData[]).map(session => {
              // 메뉴명 찾기
              const menu = MENUS.find(m => m.id === session.selected_menu_id);
              const selectedMenuName = menu?.name || `메뉴 ID: ${session.selected_menu_id}`;

              // 상담사명 찾기 (room_id에서 추출: "room_{counselor_id}_...")
              let counselorName = '알 수 없음';
              if (session.room_id) {
                const roomParts = session.room_id.split('_');
                if (roomParts.length > 1) {
                  const counselorId = roomParts[1];
                  const counselor = COUNSELORS.find(c => c.id === counselorId);
                  counselorName = counselor?.name || '알 수 없음';
                }
              }

              return {
                ...session,
                selected_menu_name: selectedMenuName,
                counselor_name: counselorName,
              };
            });

            setChatSessions(displaySessions);
          }

          // 3️⃣ 결제 내역
          const { data: paymentData } = await supabase
            .from('payments')
            .select('*')
            .eq('user_nickname', profile.nickname || '')
            .order('created_at', { ascending: false });

          if (paymentData) {
            setPayments(paymentData as Payment[]);
          }

          // 4️⃣ 적립금 내역 (후기)
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('id, created_at, credits_awarded')
            .eq('masked_name', profile.nickname || '')
            .order('created_at', { ascending: false });

          if (reviewData) {
            setReviews(reviewData as Review[]);
          }
        }
      } catch (error: any) {
        console.error('데이터 로드 오류:', error);
        toast.error('데이터 로드 실패');
      }

      setLoading(false);
    };

    loadUserData();
  }, [navigate]);

  const handleSaveBirthInfo = async () => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          birth_date: birthData.birth_date || null,
          birth_time: birthData.birth_time || null,
          gender: birthData.gender || null,
        })
        .eq('id', userProfile.id);

      if (error) {
        toast.error('저장 실패: ' + error.message);
        return;
      }

      setUserProfile({
        ...userProfile,
        birth_date: birthData.birth_date,
        birth_time: birthData.birth_time,
        gender: birthData.gender,
      });

      toast.success('생년월일이 저장되었습니다! ✨');
      setShowBirthModal(false);
    } catch (error: any) {
      toast.error('오류: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('howl_profile_id');
    localStorage.removeItem('howl_session_id');
    localStorage.removeItem('howl_last_auth_id');
    toast.info('로그아웃되었습니다 ✨');
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!userProfile) return;

    setShowDeleteModal(false);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userProfile.id);

      if (error) {
        toast.error('삭제 실패: ' + error.message);
        return;
      }

      toast.success('계정이 삭제되었습니다');
      localStorage.removeItem('howl_profile_id');
      localStorage.removeItem('howl_session_id');
      navigate('/');
    } catch (error: any) {
      toast.error('오류: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-foreground mb-2">로그인 필요</h2>
          <p className="text-sm text-muted-foreground mb-6">마이페이지는 로그인 후 이용 가능합니다</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh aurora-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 glass px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold text-secondary-foreground">👤 마이페이지</h1>
            <p className="text-[10px] text-muted-foreground">{userProfile.nickname}님의 정보</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
        {/* 1️⃣ 프로필 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6 glow-border"
        >
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> 프로필 정보
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-primary/10">
              <span className="text-sm text-muted-foreground">닉네임</span>
              <span className="font-semibold text-foreground">{userProfile.nickname}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-primary/10">
              <span className="text-sm text-muted-foreground">전화번호</span>
              <span className="font-semibold text-foreground">{userProfile.phone}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-primary/10">
              <span className="text-sm text-muted-foreground">적립금</span>
              <span className="font-bold text-primary text-lg">
                {userProfile.credits.toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-primary/10">
              <span className="text-sm text-muted-foreground">가입일</span>
              <span className="font-semibold text-foreground">
                {userProfile.created_at
                  ? new Date(userProfile.created_at).toLocaleDateString('ko-KR')
                  : '-'}
              </span>
            </div>

            {/* 생년월일, 성별 (선택사항) */}
            <div className="mt-4 pt-4 border-t border-primary/20">
              <button
                onClick={() => setShowBirthModal(true)}
                className="w-full py-2 px-3 rounded-xl glass hover:bg-white/40 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                📅 생년월일 & 성별 설정
                {userProfile.birth_date && (
                  <span className="ml-2 text-primary font-semibold">
                    ({userProfile.birth_date})
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* 2️⃣ 상담 내역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-3xl p-6 glow-border"
        >
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> 상담 내역 (최근 3일)
          </h2>

          {chatSessions.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">
              상담 내역이 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="glass rounded-xl p-3 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">
                      {session.selected_menu_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.counselor_name} 상담사
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 3️⃣ 결제 내역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-3xl p-6 glow-border"
        >
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> 결제 내역
          </h2>

          {payments.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">
              결제 내역이 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="glass rounded-xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {payment.menu_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {payment.final_price.toLocaleString()}원
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.method === 'kakaopay'
                          ? '카카오페이'
                          : payment.method === 'bank'
                            ? '무통장입금'
                            : payment.method}
                      </p>
                    </div>
                  </div>

                  {/* 할인 정보 */}
                  {payment.discount_amount > 0 && (
                    <div className="bg-primary/10 rounded-lg p-2 text-xs">
                      <p className="text-primary font-semibold">
                        💰 {payment.discount_amount.toLocaleString()}원 할인 적용
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        원가: {payment.price.toLocaleString()}원
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 4️⃣ 적립금 내역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-3xl p-6 glow-border"
        >
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> 적립금 내역
          </h2>

          {reviews.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">
              적립금 내역이 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="glass rounded-xl p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">후기 작성</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <p className="font-bold text-primary">
                    +{(review.credits_awarded || 1000).toLocaleString()}원
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 5️⃣ 계정 관리 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-strong rounded-3xl p-6 glow-border space-y-3"
        >
          <h2 className="text-xl font-bold text-foreground mb-4">⚙️ 계정 관리</h2>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl glass hover:bg-white/40 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 rounded-2xl bg-destructive/20 hover:bg-destructive/30 transition-colors font-semibold text-sm text-destructive flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> 회원탈퇴
          </button>
        </motion.div>
      </main>

      {/* 생년월일 설정 모달 */}
      {showBirthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setShowBirthModal(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
          >
            <h3 className="font-serif text-lg font-bold text-foreground mb-4">
              📅 생년월일 & 성별
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  생년월일 (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={birthData.birth_date}
                  onChange={(e) =>
                    setBirthData({ ...birthData, birth_date: e.target.value })
                  }
                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  태어난 시간 (선택)
                </label>
                <input
                  type="time"
                  value={birthData.birth_time}
                  onChange={(e) =>
                    setBirthData({ ...birthData, birth_time: e.target.value })
                  }
                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  성별 (선택)
                </label>
                <select
                  value={birthData.gender}
                  onChange={(e) =>
                    setBirthData({ ...birthData, gender: e.target.value })
                  }
                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">선택 안 함</option>
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 이 정보를 저장하면 사주 상담 시 자동으로 채워집니다!
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBirthModal(false)}
                className="flex-1 py-2 rounded-xl glass hover:bg-white/40 transition-colors font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSaveBirthInfo}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg transition-all"
              >
                저장
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 회원탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border text-center"
          >
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="font-serif text-lg font-bold text-foreground mb-2">
              정말 탈퇴하실까요?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              계정과 모든 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-xl glass hover:bg-white/40 transition-colors font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2 rounded-xl bg-destructive text-white font-semibold text-sm hover:shadow-lg transition-all"
              >
                탈퇴하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
