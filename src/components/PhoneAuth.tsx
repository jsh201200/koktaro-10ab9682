import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhoneAuthProps {
  onAuth: (profile: { id: string; phone: string; nickname: string; credits: number; birth_date?: string; birth_time?: string; gender?: string }) => void;
  onSkip: () => void;
}

export default function PhoneAuth({ onAuth, onSkip }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'new_pin' | 'verify_pin' | 'nickname'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pinFailCount, setPinFailCount] = useState(0); // 🔐 PIN 실패 횟수 추적

  // ✨ 휴대폰 자동 포맷팅: 010-XXXX-XXXX
  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  // ✨ 휴대폰 형식 검증: 010으로 시작, 11자리
  const isValidPhone = (val: string): boolean => {
    const cleanPhone = val.replace(/-/g, '');
    return cleanPhone.startsWith('010') && cleanPhone.length === 11;
  };

  const handlePhoneSubmit = async () => {
    const cleanPhone = phone.replace(/-/g, '');
    
    // ✨ 형식 검증
    if (!isValidPhone(phone)) {
      toast.error('010으로 시작하는 11자리 번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      // ✨ 중복 가입 방지: 유니크 키 확인
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (data) {
        // 이미 가입된 번호
        setExistingProfile(data);
        setPinFailCount(0); // 🔐 PIN 실패 횟수 초기화
        setPin(''); // PIN 입력창 초기화
        setStep('verify_pin');
      } else {
        // 새 가입
        setStep('new_pin');
      }
    } catch (error) {
      // 단일 결과 없음 (정상)
      setStep('new_pin');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 세션 완전 초기화 (진입 차단)
  const resetSessionCompletely = () => {
    localStorage.removeItem('howl_session_id');
    localStorage.removeItem('howl_profile_id');
    localStorage.removeItem('howl_last_auth_id');
    localStorage.removeItem('howl_last_auth_time');
    
    const newSessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('howl_session_id', newSessionId);
    
    toast.error('⚠️ 인증 실패. 새로 시작해주세요.');
    setStep('phone');
    setPhone('');
    setPin('');
    setExistingProfile(null);
    setPinFailCount(0);
  };

  const handleVerifyPin = async () => {
    if (!existingProfile) return;
    
    // 🔐 전화번호+PIN 100% 일치 검증
    if (pin === existingProfile.pin) {
      // ✅ 인증 성공
      const cachedSessionId = localStorage.getItem('howl_session_id');
      if (cachedSessionId) {
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('profile_id')
          .eq('id', cachedSessionId)
          .single();
        
        if (!sessionData || sessionData.profile_id !== existingProfile.id) {
          localStorage.removeItem('howl_session_id');
        }
      }
      
      // 🔐 인증 정보 저장
      localStorage.setItem('howl_profile_id', existingProfile.id);
      localStorage.setItem('howl_last_auth_id', existingProfile.id);
      localStorage.setItem('howl_last_auth_time', Date.now().toString());
      
      onAuth({
        id: existingProfile.id,
        phone: existingProfile.phone,
        nickname: existingProfile.nickname || '',
        credits: existingProfile.credits || 0,
        birth_date: existingProfile.birth_date,
        birth_time: existingProfile.birth_time,
        gender: existingProfile.gender,
      });
      toast.success(`${existingProfile.nickname || ''}님, 다시 만나서 반가워요! ✨`);
      setPinFailCount(0); // 성공 시 실패 횟수 초기화
    } else {
      // ❌ 인증 실패
      const newFailCount = pinFailCount + 1;
      setPinFailCount(newFailCount);
      setPin('');

      if (newFailCount >= 3) {
        // 🔐 3회 이상 실패 → 진입 차단 & 새 세션
        toast.error(`⚠️ 비밀번호 ${newFailCount}회 오류. 보안을 위해 새로 시작합니다.`);
        resetSessionCompletely();
      } else {
        // 경고 메시지
        const remainAttempts = 3 - newFailCount;
        toast.error(`비밀번호가 일치하지 않아요. (${remainAttempts}회 남음)`);
      }
    }
  };

  const handleNewPin = () => {
    if (pin.length !== 4) {
      toast.error('4자리 비밀번호를 입력해주세요');
      return;
    }
    setStep('nickname');
  };

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      toast.error('호칭을 입력해주세요');
      return;
    }

    const cleanPhone = phone.replace(/-/g, '');
    setIsLoading(true);

    try {
      // ✨ 중복 가입 방지: INSERT 전 최종 확인
      const { data: existingData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .single();

      if (existingData) {
        toast.error('이미 가입된 번호입니다. 로그인해주세요.');
        setStep('phone');
        return;
      }

      // 🔐 새 프로필 생성 (전화번호+PIN으로 보호)
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          phone: cleanPhone,
          pin, // PIN(비밀번호) 저장
          nickname: nickname.trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // 유니크 제약 위반
          toast.error('이미 가입된 번호입니다');
          setStep('phone');
          return;
        }
        toast.error('프로필 생성에 실패했어요');
        return;
      }

      // 🔐 새 세션 생성
      localStorage.removeItem('howl_session_id');
      const newSessionId = `session_${Date.now()}_${Math.random()}`;
      localStorage.setItem('howl_session_id', newSessionId);
      
      // 🔐 인증 정보 저장
      localStorage.setItem('howl_profile_id', data.id);
      localStorage.setItem('howl_last_auth_id', data.id);
      localStorage.setItem('howl_last_auth_time', Date.now().toString());

      onAuth({
        id: data.id,
        phone: cleanPhone,
        nickname: nickname.trim(),
        credits: 0,
      });
      toast.success('프로필이 생성되었어요! ✨');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
      >
        <div className="text-center mb-5">
          <span className="text-3xl mb-2 block">🔮</span>
          <h3 className="font-display text-xl font-bold text-foreground neon-glow">콕타로</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 'phone' && '전화번호로 간편하게 시작해요'}
            {step === 'verify_pin' && '비밀번호를 입력해주세요'}
            {step === 'new_pin' && '상담용 비밀번호 4자리를 설정해주세요'}
            {step === 'nickname' && '상담사가 부를 호칭을 알려주세요'}
          </p>
        </div>

        {step === 'phone' && (
          <div className="space-y-3">
            <input
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              className="w-full p-3 rounded-2xl glass text-center text-lg tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="010-0000-0000"
              type="tel"
              autoFocus
            />
            <button
              onClick={handlePhoneSubmit}
              disabled={!isValidPhone(phone) || isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? '확인 중...' : '다음'}
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              번호 없이 시작하기
            </button>
          </div>
        )}

        {step === 'verify_pin' && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-3 mb-2">
              <p className="text-xs text-muted-foreground text-center">
                {pinFailCount > 0 && (
                  <span className="text-destructive">⚠️ {pinFailCount}회 실패 (3회 초과 시 차단)</span>
                )}
                {pinFailCount === 0 && (
                  <span>비밀번호를 입력해주세요</span>
                )}
              </p>
            </div>
            <input
              value={pin}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="····"
              type="password"
              maxLength={4}
              autoFocus
              disabled={pinFailCount >= 3}
            />
            <button
              onClick={handleVerifyPin}
              disabled={pin.length !== 4 || pinFailCount >= 3}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {pinFailCount >= 3 ? '차단됨' : '확인'}
            </button>
            <button
              onClick={() => { 
                setStep('phone'); 
                setPhone('');
                setPin('');
                setExistingProfile(null);
                setPinFailCount(0);
              }}
              disabled={pinFailCount >= 3}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              ← 번호 다시 입력
            </button>
          </div>
        )}

        {step === 'new_pin' && (
          <div className="space-y-3">
            <input
              value={pin}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="····"
              type="password"
              maxLength={4}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground text-center">
              🔐 다음 방문 시 이 비밀번호로 로그인하실 수 있어요. 꼭 기억해주세요!
            </p>
            <button
              onClick={handleNewPin}
              disabled={pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}

        {step === 'nickname' && (
          <div className="space-y-3">
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full p-3 rounded-2xl glass text-center text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="호칭을 입력해주세요"
              autoFocus
            />
            <button
              onClick={handleCreateProfile}
              disabled={!nickname.trim() || isLoading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? '생성 중...' : '상담 시작하기 ✨'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
