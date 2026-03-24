import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';

interface PhoneAuthProps {
  onAuth: (profile: { 
    id: string; 
    phone: string; 
    nickname: string; 
    credits: number; 
    birth_date?: string; 
    birth_time?: string; 
    gender?: string;
    approvedPayment?: {
      menu_id: number;
      menu_name: string;
      price: number;
      approved_at: string;
      phone_tail: string;
    } | null;
  }) => void;
  currentProfile?: { phone: string; nickname: string } | null;
  onLogout?: () => void;
}

export default function PhoneAuth({ onAuth, currentProfile, onLogout }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'new_pin' | 'verify_pin' | 'nickname' | 'terms' | 'logged_in'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pinFailCount, setPinFailCount] = useState(0);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const isValidPhone = (val: string): boolean => {
    const cleanPhone = val.replace(/-/g, '');
    return cleanPhone.startsWith('010') && cleanPhone.length === 11;
  };

  const handlePhoneSubmit = async () => {
    const cleanPhone = phone.replace(/-/g, '');
    
    if (!isValidPhone(phone)) {
      toast.error('올바른 휴대폰 번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast.error('조회 중 오류가 발생했습니다');
      setIsLoading(false);
      return;
    }

    if (data) {
      setExistingProfile(data);
      setPinFailCount(0);
      setStep('verify_pin');
    } else {
      setStep('new_pin');
    }
    setIsLoading(false);
  };

  const handleNewPinSubmit = async () => {
    if (pin.length !== 4 || isNaN(Number(pin))) {
      toast.error('4자리 숫자를 입력해주세요');
      return;
    }
    setStep('nickname');
  };

  const handleVerifyPin = async () => {
    if (pin.length !== 4 || isNaN(Number(pin))) {
      toast.error('4자리 숫자를 입력해주세요');
      return;
    }

    if (pin !== existingProfile.pin) {
      setPinFailCount(pinFailCount + 1);
      if (pinFailCount >= 4) {
        toast.error('비밀번호 오류가 5회 이상입니다. 관리자에게 문의하세요.');
        setStep('phone');
        setPhone('');
        setPinFailCount(0);
        return;
      }
      toast.error(`비밀번호가 틀렸습니다 (${5 - pinFailCount - 1}회 남음)`);
      setPin('');
      return;
    }

    localStorage.removeItem('howl_session_id');
    const newSessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('howl_session_id', newSessionId);

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_nickname', existingProfile.nickname)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single();

    const approvedPayment = payments ? {
      menu_id: payments.menu_id,
      menu_name: payments.menu_name,
      price: payments.final_price || payments.price,
      approved_at: payments.approved_at,
      phone_tail: payments.phone_tail,
    } : null;

    localStorage.setItem('howl_profile_id', existingProfile.id);
    localStorage.setItem('howl_last_auth_id', existingProfile.id);

    onAuth({
      ...existingProfile,
      approvedPayment,
    });

    toast.success('로그인되었습니다 ✨');
    setPin('');
  };

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      toast.error('닉네임을 입력해주세요');
      return;
    }
    if (nickname.length > 20) {
      toast.error('닉네임은 20자 이내로 입력해주세요');
      return;
    }
    if (pin.length !== 4 || isNaN(Number(pin))) {
      toast.error('4자리 숫자 비밀번호를 입력해주세요');
      return;
    }
    setStep('terms');
  };

  const handleTermsAgree = async () => {
    if (!termsAgreed) {
      toast.error('약관에 동의해주세요');
      return;
    }
    setIsLoading(true);
    const cleanPhone = phone.replace(/-/g, '');
    localStorage.removeItem('howl_session_id');
    const newSessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('howl_session_id', newSessionId);

    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert({
        phone: cleanPhone,
        nickname: nickname.trim(),
        pin,
        credits: 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('가입 중 오류가 발생했습니다');
      setIsLoading(false);
      return;
    }

    localStorage.setItem('howl_profile_id', newProfile.id);
    localStorage.setItem('howl_last_auth_id', newProfile.id);

    onAuth({
      id: newProfile.id,
      phone: newProfile.phone,
      nickname: newProfile.nickname,
      credits: newProfile.credits || 0,
      approvedPayment: null,
    });

    toast.success('가입이 완료되었습니다! ✨');
    setPhone('');
    setPin('');
    setNickname('');
    setTermsAgreed(false);
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('howl_profile_id');
    localStorage.removeItem('howl_last_auth_id');
    localStorage.removeItem('howl_session_id');
    setPhone('');
    setPin('');
    setNickname('');
    setStep('phone');
    if (onLogout) onLogout();
    toast.info('로그아웃되었습니다 ✨');
  };

  if (currentProfile && step === 'logged_in') {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border"
        >
          <span className="text-4xl mb-4 block">👤</span>
          <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-2">로그인됨</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {currentProfile.nickname}님 ({currentProfile.phone})
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setStep('phone')}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              계속하기
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-2xl glass text-foreground font-semibold text-sm hover:bg-muted/70 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              다른 계정으로 로그인
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border"
      >
        {step === 'phone' && (
          <form onSubmit={(e) => { e.preventDefault(); handlePhoneSubmit(); }}>
            <span className="text-4xl mb-4 block">📞</span>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-6">휴대폰 번호</h2>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="w-full p-3 rounded-2xl glass text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              maxLength={13}
              autoFocus
            />
            <button
              type="submit"
              disabled={!isValidPhone(phone) || isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? '확인 중...' : '다음'}
            </button>
          </form>
        )}

        {step === 'new_pin' && (
          <form onSubmit={(e) => { e.preventDefault(); handleNewPinSubmit(); }}>
            <span className="text-4xl mb-4 block">🔐</span>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-2">4자리 비밀번호 설정</h2>
            <p className="text-xs text-muted-foreground mb-6">숫자 4개를 조합해주세요</p>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              maxLength={4}
              autoFocus
            />
            <button
              type="submit"
              disabled={pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              다음
            </button>
            <button type="button" onClick={() => { setStep('phone'); setPhone(''); setPin(''); }} className="w-full mt-3 py-2 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← 뒤로
            </button>
          </form>
        )}

        {step === 'verify_pin' && (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyPin(); }}>
            <span className="text-4xl mb-4 block">🔐</span>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-2">비밀번호 확인</h2>
            <p className="text-xs text-muted-foreground mb-6">4자리 비밀번호를 입력해주세요</p>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              maxLength={4}
              autoFocus
            />
            <button
              type="submit"
              disabled={pin.length !== 4 || isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? '확인 중...' : '로그인'}
            </button>
            <button type="button" onClick={() => { setStep('phone'); setPhone(''); setPin(''); setPinFailCount(0); }} className="w-full mt-3 py-2 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← 뒤로
            </button>
          </form>
        )}

        {step === 'nickname' && (
          <form onSubmit={(e) => { e.preventDefault(); handleCreateProfile(); }}>
            <span className="text-4xl mb-4 block">✨</span>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-6">닉네임 설정</h2>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full p-3 rounded-2xl glass text-center focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              maxLength={20}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mb-4">{nickname.length}/20</p>
            <button
              type="submit"
              disabled={!nickname.trim() || pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              다음
            </button>
            <button type="button" onClick={() => { setStep('new_pin'); setNickname(''); }} className="w-full mt-3 py-2 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← 뒤로
            </button>
          </form>
        )}

        {step === 'terms' && (
          <form onSubmit={(e) => { e.preventDefault(); handleTermsAgree(); }}>
            <span className="text-4xl mb-4 block">📋</span>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-6">약관 동의</h2>
            <div className="bg-muted/30 rounded-2xl p-4 max-h-40 overflow-y-auto mb-4 text-left">
              <p className="text-xs text-muted-foreground leading-relaxed">
                본 서비스는 데이터 분석을 기반으로 한 인사이트 에듀테인먼트 콘텐츠입니다.
                <br /><br />
                상담 결과는 자기 탐색을 위한 참고 자료일 뿐 법적 책임을 보장하지 않습니다.
                <br /><br />
                개인정보는 안전하게 보호되며 서비스 제공 목적으로만 사용됩니다.
              </p>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-2xl glass cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-xs text-muted-foreground">약관에 동의합니다</span>
            </label>
            <button
              type="submit"
              disabled={!termsAgreed || isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? '가입 중...' : '가입 완료'}
            </button>
            <button type="button" onClick={() => { setStep('nickname'); setTermsAgreed(false); }} className="w-full mt-3 py-2 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← 뒤로
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
